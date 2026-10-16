import { supabaseAdmin, isSupabaseConfigured } from '../config/supabase.js';

let demoCommissionPayments = [];

export const getTodayMetrics = async (req, res, next) => {
  try {
    const ownerId = req.user.id;
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const startIso = startOfDay.toISOString();

    if (!isSupabaseConfigured()) {
      return res.json({
        success: true,
        metrics: {
          products_added_today: 0,
          combos_added_today: 0,
          orders_received_today: 0,
          deliveries_completed_today: 0,
          units_sold_today: 0,
          gross_sales_today: 0,
          commission_earned_today: 0,
          commission_paid_today: 0,
          pending_verification: 0,
          outstanding_commission: 0,
        },
        sold_items: [],
        commission_payments: demoCommissionPayments.filter((c) => c.owner_id === ownerId),
      });
    }

    // 1. Products added today
    const { count: prodsToday } = await supabaseAdmin
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', ownerId)
      .eq('type', 'single')
      .gte('created_at', startIso);

    const { count: combosToday } = await supabaseAdmin
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', ownerId)
      .eq('type', 'combo')
      .gte('created_at', startIso);

    // 2. Orders received today
    const { data: ordersToday } = await supabaseAdmin
      .from('orders')
      .select('*, order_items(*)')
      .eq('owner_id', ownerId)
      .gte('created_at', startIso);

    // 3. Completed orders (lifetime and today)
    const { data: allDeliveredOrders } = await supabaseAdmin
      .from('orders')
      .select('*, order_items(*)')
      .eq('owner_id', ownerId)
      .eq('order_status', 'Delivered');

    const deliveredToday = (allDeliveredOrders || []).filter((o) => o.delivered_at >= startIso);

    let grossToday = 0;
    let commToday = 0;
    let unitsToday = 0;
    const soldMap = {};

    deliveredToday.forEach((o) => {
      grossToday += Number(o.subtotal);
      commToday += (Number(o.subtotal) * Number(o.commission_rate)) / 100;
      (o.order_items || []).forEach((it) => {
        unitsToday += Number(it.quantity);
        if (!soldMap[it.product_name]) {
          soldMap[it.product_name] = { name: it.product_name, quantity: 0, amount: 0 };
        }
        soldMap[it.product_name].quantity += Number(it.quantity);
        soldMap[it.product_name].amount += Number(it.price) * Number(it.quantity);
      });
    });

    // Lifetime commission accrued
    let totalCommissionAccrued = 0;
    (allDeliveredOrders || []).forEach((o) => {
      totalCommissionAccrued += (Number(o.subtotal) * Number(o.commission_rate)) / 100;
    });

    // Commission payments
    const { data: commPayments } = await supabaseAdmin
      .from('commission_payments')
      .select('*')
      .eq('owner_id', ownerId)
      .order('submitted_at', { ascending: false });

    let verifiedPaid = 0;
    let pendingVerification = 0;
    let paidToday = 0;

    (commPayments || []).forEach((c) => {
      if (c.status === 'Paid') {
        verifiedPaid += Number(c.amount);
        if (c.verified_at >= startIso) {
          paidToday += Number(c.amount);
        }
      } else if (c.status === 'Pending Verification') {
        pendingVerification += Number(c.amount);
      }
    });

    // Approved reductions from commission_audits
    const { data: audits } = await supabaseAdmin
      .from('commission_audits')
      .select('reduction')
      .eq('owner_id', ownerId);

    let totalReductions = 0;
    (audits || []).forEach((a) => {
      totalReductions += Number(a.reduction);
    });

    const outstanding = Math.max(0, Math.round((totalCommissionAccrued - totalReductions - verifiedPaid) * 100) / 100);

    res.json({
      success: true,
      metrics: {
        products_added_today: prodsToday || 0,
        combos_added_today: combosToday || 0,
        orders_received_today: (ordersToday || []).length,
        deliveries_completed_today: deliveredToday.length,
        units_sold_today: unitsToday,
        gross_sales_today: Math.round(grossToday * 100) / 100,
        commission_earned_today: Math.round(commToday * 100) / 100,
        commission_paid_today: Math.round(paidToday * 100) / 100,
        pending_verification: Math.round(pendingVerification * 100) / 100,
        outstanding_commission: outstanding,
      },
      sold_items: Object.values(soldMap),
      commission_payments: commPayments || [],
    });
  } catch (error) {
    next(error);
  }
};

export const payCommission = async (req, res, next) => {
  try {
    const ownerId = req.user.id;
    const { amount, reference, proof_url } = req.body;

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ success: false, message: 'Please enter a valid amount above 0.' });
    }

    if (!reference || !/^[A-Za-z0-9]{8,22}$/.test(reference)) {
      return res.status(400).json({ success: false, message: 'Please enter a valid 8-22 character UTR / reference.' });
    }

    if (!proof_url) {
      return res.status(400).json({ success: false, message: 'Payment screenshot proof is required.' });
    }

    const payId = 'CP-' + (1001 + Math.floor(Math.random() * 9000));
    const now = new Date().toISOString();

    if (!isSupabaseConfigured()) {
      const payment = {
        id: payId,
        owner_id: ownerId,
        amount: Number(amount),
        reference,
        proof_url,
        status: 'Pending Verification',
        submitted_at: now,
      };
      demoCommissionPayments.unshift(payment);
      return res.status(201).json({
        success: true,
        message: 'Commission payment submitted for verification. Balance will update once approved.',
        payment,
      });
    }

    const { data: payment, error } = await supabaseAdmin
      .from('commission_payments')
      .insert({
        id: payId,
        owner_id: ownerId,
        amount: Number(amount),
        reference,
        proof_url,
        status: 'Pending Verification',
      })
      .select()
      .single();

    if (error) {
      return res.status(400).json({ success: false, message: error.message });
    }

    // Notify admin
    await supabaseAdmin.from('notifications').insert({
      recipient_role: 'admin',
      recipient_id: null,
      title: 'Commission payment to verify',
      message: `${req.user.shop_name || req.user.full_name} · ₹${amount} · UTR: ${reference}`,
      navigation_json: { view: 'ver' },
    });

    res.status(201).json({
      success: true,
      message: 'Commission payment submitted for verification. Balance will update once approved.',
      payment,
    });
  } catch (error) {
    next(error);
  }
};

export const getAnalytics = async (req, res, next) => {
  try {
    const ownerId = req.user.id;
    const { from, to, group_by } = req.query;

    if (!isSupabaseConfigured()) {
      return res.json({
        success: true,
        analytics: {
          revenue_series: [],
          units_series: [],
          top_products: [],
          least_products: [],
          top_combos: [],
          low_stock: [],
        },
      });
    }

    // Fetch products
    const { data: products } = await supabaseAdmin
      .from('products')
      .select('*')
      .eq('owner_id', ownerId)
      .eq('status', 'Active');

    // Fetch delivered orders
    let query = supabaseAdmin
      .from('orders')
      .select('*, order_items(*)')
      .eq('owner_id', ownerId)
      .eq('order_status', 'Delivered');

    if (from) query = query.gte('delivered_at', from);
    if (to) query = query.lte('delivered_at', to);

    const { data: orders } = await query;

    const prodStats = {};
    (products || []).forEach((p) => {
      prodStats[p.id] = { id: p.id, name: p.name, units: 0, revenue: 0, type: p.type, stock: p.stock };
    });

    (orders || []).forEach((o) => {
      (o.order_items || []).forEach((it) => {
        if (prodStats[it.product_id]) {
          prodStats[it.product_id].units += Number(it.quantity);
          prodStats[it.product_id].revenue += Number(it.price) * Number(it.quantity);
        }
      });
    });

    const statList = Object.values(prodStats);
    const sortedDesc = [...statList].sort((a, b) => b.units - a.units);
    const sortedAsc = [...statList].sort((a, b) => a.units - b.units);

    const lowStock = (products || [])
      .filter((p) => Number(p.stock) <= 5)
      .map((p) => ({ name: p.name, stock: Number(p.stock) }));

    res.json({
      success: true,
      analytics: {
        top_products: sortedDesc.filter((p) => p.units > 0).slice(0, 5),
        least_products: sortedAsc.slice(0, 5),
        top_combos: sortedDesc.filter((p) => p.type === 'combo' && p.units > 0).slice(0, 5),
        low_stock: lowStock,
      },
    });
  } catch (error) {
    next(error);
  }
};
