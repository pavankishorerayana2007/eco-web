import { supabaseAdmin, isSupabaseConfigured } from '../config/supabase.js';

let demoOrders = [];
let demoBuyerPayments = [];
let orderCounter = 100100;

export const createOrder = async (req, res, next) => {
  try {
    const buyer = req.user;
    const { items, address, payment_method, utr_reference, proof_url } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Cart is empty. Please add items to checkout.' });
    }

    if (!address || !address.name || !address.mobile || !address.address) {
      return res.status(400).json({ success: false, message: 'Complete delivery address and contact details are required.' });
    }

    if (!['cod', 'on'].includes(payment_method)) {
      return res.status(400).json({ success: false, message: 'Invalid payment method.' });
    }

    if (payment_method === 'on') {
      if (!utr_reference || !/^[A-Za-z0-9]{8,22}$/.test(utr_reference)) {
        return res.status(400).json({ success: false, message: 'Please provide a valid 8-22 character UTR / transaction reference.' });
      }
      if (!proof_url) {
        return res.status(400).json({ success: false, message: 'Payment screenshot proof is required for online payments.' });
      }
    }

    // Fetch commission rate from system_settings
    let commissionRate = 5.0;
    if (isSupabaseConfigured()) {
      const { data: setting } = await supabaseAdmin
        .from('system_settings')
        .select('value')
        .eq('key', 'platform_commission')
        .maybeSingle();
      if (setting && setting.value && setting.value.rate) {
        commissionRate = Number(setting.value.rate);
      }
    }

    // Group items by owner_id
    const storeGroups = {};
    for (const item of items) {
      const oid = item.owner_id;
      if (!storeGroups[oid]) storeGroups[oid] = [];
      storeGroups[oid].push(item);
    }

    const createdOrders = [];

    for (const [ownerId, storeItems] of Object.entries(storeGroups)) {
      // Check if store is paused
      if (isSupabaseConfigured()) {
        const { data: ownerProfile } = await supabaseAdmin
          .from('profiles')
          .select('store_status, store_pause_message, shop_name')
          .eq('id', ownerId)
          .single();

        if (ownerProfile && ownerProfile.store_status === 'paused') {
          return res.status(400).json({
            success: false,
            message: `This Store Is Temporarily Paused (${ownerProfile.shop_name}): ${ownerProfile.store_pause_message || 'Not accepting orders right now.'}`,
          });
        }
      }

      // Calculate totals
      let subtotal = 0;
      for (const it of storeItems) {
        const price = Number(it.price);
        const qty = Number(it.quantity);
        subtotal += price * qty;
      }
      subtotal = Math.round(subtotal * 100) / 100;
      const deliveryFee = subtotal >= 999 ? 0 : 49;
      const total = Math.round((subtotal + deliveryFee) * 100) / 100;

      const orderId = 'QM-' + (++orderCounter);
      const isOnline = payment_method === 'on';
      const orderStatus = isOnline ? 'Awaiting Payment' : 'Placed';
      const paymentStatus = isOnline ? 'Awaiting Verification' : 'Pending';

      if (!isSupabaseConfigured()) {
        const newOrder = {
          id: orderId,
          buyer_id: buyer.id,
          buyer_email: buyer.email,
          owner_id: ownerId,
          subtotal,
          delivery_fee: deliveryFee,
          total,
          payment_method,
          payment_status: paymentStatus,
          order_status: orderStatus,
          buyer_name: address.name,
          buyer_mobile: address.mobile,
          delivery_address: address.address,
          delivery_city: address.city || '',
          delivery_state: address.state || '',
          delivery_pincode: address.pincode || '',
          delivery_instructions: address.instructions || '',
          delivery_location: address.location || `${address.address}, ${address.city || ''}`,
          commission_rate: commissionRate,
          utr_reference: isOnline ? utr_reference : null,
          proof_url: isOnline ? proof_url : null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          items: storeItems.map((it) => ({
            product_id: it.product_id || it.id,
            product_name: it.name,
            quantity: Number(it.quantity),
            price: Number(it.price),
            unit: it.unit || 'pcs',
            product_type: it.product_type || 'Packaged',
            package_size: it.package_size ? String(it.package_size) : '',
            quantity_display: it.quantity_display || `${it.quantity} ${it.unit || ''}`,
            image_url: it.image_url || '',
          })),
          history: [{ status: orderStatus, created_at: new Date().toISOString() }],
        };
        demoOrders.unshift(newOrder);

        if (isOnline) {
          demoBuyerPayments.push({
            id: 'BP-' + (2001 + demoBuyerPayments.length),
            order_id: orderId,
            owner_id: ownerId,
            buyer_id: buyer.id,
            kind: 'online',
            amount: total,
            method: 'UPI QR',
            reference: utr_reference,
            proof_url,
            status: 'Pending Verification',
            submitted_at: new Date().toISOString(),
          });
        }

        createdOrders.push(newOrder);
        continue;
      }

      // Check and update inventory in Supabase
      for (const it of storeItems) {
        const prodId = it.product_id || it.id;
        const { data: prod } = await supabaseAdmin
          .from('products')
          .select('stock, name')
          .eq('id', prodId)
          .single();

        if (!prod || prod.stock < Number(it.quantity)) {
          return res.status(400).json({
            success: false,
            message: `Insufficient stock for ${it.name}. Available: ${prod ? prod.stock : 0}`,
          });
        }

        const newStock = Math.round((Number(prod.stock) - Number(it.quantity)) * 1000) / 1000;
        await supabaseAdmin
          .from('products')
          .update({ stock: newStock, updated_at: new Date().toISOString() })
          .eq('id', prodId);

        await supabaseAdmin.from('product_logs').insert({
          product_id: prodId,
          kind: 'Quantity decreased',
          details: `Reserved for order ${orderId}`,
          quantity_delta: -Number(it.quantity),
        });
      }

      // Insert Order record
      const { data: order, error: orderError } = await supabaseAdmin
        .from('orders')
        .insert({
          id: orderId,
          buyer_id: buyer.id,
          buyer_email: buyer.email,
          owner_id: ownerId,
          subtotal,
          delivery_fee: deliveryFee,
          total,
          payment_method,
          payment_status: paymentStatus,
          order_status: orderStatus,
          buyer_name: address.name,
          buyer_mobile: address.mobile,
          delivery_address: address.address,
          delivery_city: address.city || '',
          delivery_state: address.state || '',
          delivery_pincode: address.pincode || '',
          delivery_instructions: address.instructions || '',
          delivery_location: address.location || `${address.address}, ${address.city || ''}`,
          commission_rate: commissionRate,
          utr_reference: isOnline ? utr_reference : null,
          proof_url: isOnline ? proof_url : null,
          proof_submitted_at: isOnline ? new Date().toISOString() : null,
        })
        .select()
        .single();

      if (orderError) {
        return res.status(400).json({ success: false, message: orderError.message });
      }

      // Insert Order Items
      const orderItemsRecords = storeItems.map((it) => ({
        order_id: orderId,
        product_id: it.product_id || it.id,
        product_name: it.name,
        quantity: Number(it.quantity),
        price: Number(it.price),
        unit: it.unit || 'pcs',
        product_type: it.product_type || 'Packaged',
        package_size: it.package_size ? String(it.package_size) : '',
        quantity_display: it.quantity_display || `${it.quantity} ${it.unit || ''}`,
        image_url: it.image_url || null,
      }));
      await supabaseAdmin.from('order_items').insert(orderItemsRecords);

      // Insert Order History
      await supabaseAdmin.from('order_history').insert({
        order_id: orderId,
        status: orderStatus,
      });

      // If online, record in buyer_payments
      if (isOnline) {
        const bpId = 'BP-' + (2001 + Math.floor(Math.random() * 9000));
        await supabaseAdmin.from('buyer_payments').insert({
          id: bpId,
          order_id: orderId,
          owner_id: ownerId,
          buyer_id: buyer.id,
          kind: 'online',
          amount: total,
          method: 'UPI QR',
          reference: utr_reference,
          proof_url,
          status: 'Pending Verification',
        });

        // Notify admin for verification
        await supabaseAdmin.from('notifications').insert({
          recipient_role: 'admin',
          recipient_id: null,
          title: 'Payment to verify',
          message: `${orderId} · ₹${total} · UTR: ${utr_reference}`,
          navigation_json: { view: 'ver' },
        });
      }

      // Notifications for buyer & owner
      await supabaseAdmin.from('notifications').insert([
        {
          recipient_role: 'buyer',
          recipient_id: buyer.id,
          title: isOnline ? 'Payment proof submitted' : 'Order Placed',
          message: `${orderId} · ₹${total} · ${isOnline ? 'Awaiting verification' : 'Cash on Delivery'}`,
          navigation_json: { view: 'orders' },
        },
        {
          recipient_role: 'owner',
          recipient_id: ownerId,
          title: 'New order received',
          message: `${orderId} · ₹${total} · ${isOnline ? 'Online' : 'COD'}`,
          navigation_json: { view: 'ord' },
        },
      ]);

      createdOrders.push(order);
    }

    res.status(201).json({
      success: true,
      message: 'Order(s) placed successfully.',
      orders: createdOrders,
    });
  } catch (error) {
    next(error);
  }
};

export const getMyOrders = async (req, res, next) => {
  try {
    const buyerId = req.user.id;

    if (!isSupabaseConfigured()) {
      const orders = demoOrders.filter((o) => o.buyer_id === buyerId || o.buyer_email === req.user.email);
      return res.json({ success: true, count: orders.length, orders });
    }

    const { data: orders, error } = await supabaseAdmin
      .from('orders')
      .select('*, order_items(*), order_history(*)')
      .eq('buyer_id', buyerId)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(400).json({ success: false, message: error.message });
    }

    res.json({ success: true, count: orders.length, orders });
  } catch (error) {
    next(error);
  }
};

export const getOwnerOrders = async (req, res, next) => {
  try {
    const ownerId = req.user.id;

    if (!isSupabaseConfigured()) {
      const orders = demoOrders.filter((o) => o.owner_id === ownerId);
      return res.json({ success: true, count: orders.length, orders });
    }

    const { data: orders, error } = await supabaseAdmin
      .from('orders')
      .select('*, order_items(*), order_history(*)')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(400).json({ success: false, message: error.message });
    }

    res.json({ success: true, count: orders.length, orders });
  } catch (error) {
    next(error);
  }
};

export const cancelOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const buyerId = req.user.id;
    const now = new Date().toISOString();

    if (!isSupabaseConfigured()) {
      const order = demoOrders.find((o) => o.id === id);
      if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });

      if (!['Placed', 'Awaiting Payment'].includes(order.order_status)) {
        return res.status(400).json({ success: false, message: 'This order can no longer be cancelled.' });
      }

      order.order_status = 'Cancelled';
      order.payment_status = 'Cancelled';
      order.cancelled_at = now;
      order.history.push({ status: 'Cancelled', created_at: now });

      return res.json({ success: true, message: 'Order cancelled successfully.', order });
    }

    const { data: order, error: fetchErr } = await supabaseAdmin
      .from('orders')
      .select('*, order_items(*)')
      .eq('id', id)
      .single();

    if (fetchErr || !order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    if (order.buyer_id !== buyerId && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to cancel this order.' });
    }

    if (!['Placed', 'Awaiting Payment'].includes(order.order_status)) {
      return res.status(400).json({ success: false, message: 'This order can no longer be cancelled.' });
    }

    // Restore stock
    for (const it of order.order_items) {
      const { data: prod } = await supabaseAdmin
        .from('products')
        .select('stock')
        .eq('id', it.product_id)
        .single();

      if (prod) {
        await supabaseAdmin
          .from('products')
          .update({ stock: Number(prod.stock) + Number(it.quantity) })
          .eq('id', it.product_id);

        await supabaseAdmin.from('product_logs').insert({
          product_id: it.product_id,
          kind: 'Quantity increased',
          details: `Order cancelled: ${id}`,
          quantity_delta: Number(it.quantity),
        });
      }
    }

    const { data: updated, error: updateErr } = await supabaseAdmin
      .from('orders')
      .update({
        order_status: 'Cancelled',
        payment_status: 'Cancelled',
        cancelled_at: now,
        updated_at: now,
      })
      .eq('id', id)
      .select()
      .single();

    if (updateErr) {
      return res.status(400).json({ success: false, message: updateErr.message });
    }

    await supabaseAdmin.from('order_history').insert({
      order_id: id,
      status: 'Cancelled',
    });

    await supabaseAdmin.from('notifications').insert({
      recipient_role: 'owner',
      recipient_id: order.owner_id,
      title: 'Order cancelled',
      message: `${id} was cancelled by the buyer.`,
    });

    res.json({ success: true, message: 'Order cancelled successfully.', order: updated });
  } catch (error) {
    next(error);
  }
};

export const confirmReceived = async (req, res, next) => {
  try {
    const { id } = req.params;
    const buyerId = req.user.id;
    const now = new Date().toISOString();

    if (!isSupabaseConfigured()) {
      const order = demoOrders.find((o) => o.id === id);
      if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });

      if (order.order_status !== 'Placed') {
        return res.status(400).json({ success: false, message: 'Only placed orders can be marked as received.' });
      }

      order.order_status = 'Delivered';
      order.delivered_at = now;
      order.buyer_received_at = now;
      order.history.push({ status: 'Delivered', created_at: now });

      return res.json({ success: true, message: 'Order marked as Delivered.', order });
    }

    const { data: order, error: fetchErr } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchErr || !order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    if (order.buyer_id !== buyerId) {
      return res.status(403).json({ success: false, message: 'Only the buyer who placed the order can confirm collection.' });
    }

    if (order.order_status !== 'Placed') {
      return res.status(400).json({ success: false, message: 'Only placed orders can be confirmed as collected.' });
    }

    const { data: updated, error: updateErr } = await supabaseAdmin
      .from('orders')
      .update({
        order_status: 'Delivered',
        delivered_at: now,
        buyer_received_at: now,
        updated_at: now,
      })
      .eq('id', id)
      .select()
      .single();

    if (updateErr) {
      return res.status(400).json({ success: false, message: updateErr.message });
    }

    await supabaseAdmin.from('order_history').insert({
      order_id: id,
      status: 'Delivered',
    });

    // Notify owner & admin
    await supabaseAdmin.from('notifications').insert([
      {
        recipient_role: 'owner',
        recipient_id: order.owner_id,
        title: 'Order delivered',
        message: `${id}: buyer confirmed collection.`,
      },
      {
        recipient_role: 'admin',
        recipient_id: null,
        title: 'Commission accrued',
        message: `${id} delivered. Commission eligible for settlement.`,
      },
    ]);

    res.json({ success: true, message: 'Order collection confirmed.', order: updated });
  } catch (error) {
    next(error);
  }
};

export const confirmPaidCash = async (req, res, next) => {
  try {
    const { id } = req.params;
    const buyerId = req.user.id;
    const now = new Date().toISOString();

    if (!isSupabaseConfigured()) {
      const order = demoOrders.find((o) => o.id === id);
      if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });

      if (order.payment_method !== 'cod' || order.order_status !== 'Delivered') {
        return res.status(400).json({ success: false, message: 'Cash confirmation requires a delivered Cash on Delivery order.' });
      }

      order.payment_status = 'Paid';
      order.paid_at = now;
      demoBuyerPayments.push({
        id: 'BP-' + (2001 + demoBuyerPayments.length),
        order_id: id,
        owner_id: order.owner_id,
        buyer_id: buyerId,
        kind: 'cod',
        amount: order.total,
        method: 'Cash (buyer confirmed)',
        reference: `CASH-${id}`,
        status: 'Paid',
        submitted_at: now,
        verified_at: now,
      });

      return res.json({ success: true, message: 'Order marked as Paid.', order });
    }

    const { data: order, error: fetchErr } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchErr || !order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    if (order.buyer_id !== buyerId) {
      return res.status(403).json({ success: false, message: 'Only the buyer can confirm cash payment.' });
    }

    if (order.payment_method !== 'cod' || order.order_status !== 'Delivered') {
      return res.status(400).json({ success: false, message: 'Cash confirmation requires a delivered Cash on Delivery order.' });
    }

    const { data: updated, error: updateErr } = await supabaseAdmin
      .from('orders')
      .update({
        payment_status: 'Paid',
        paid_at: now,
        updated_at: now,
      })
      .eq('id', id)
      .select()
      .single();

    if (updateErr) {
      return res.status(400).json({ success: false, message: updateErr.message });
    }

    const bpId = 'BP-' + (2001 + Math.floor(Math.random() * 9000));
    await supabaseAdmin.from('buyer_payments').insert({
      id: bpId,
      order_id: id,
      owner_id: order.owner_id,
      buyer_id: buyerId,
      kind: 'cod',
      amount: order.total,
      method: 'Cash (buyer confirmed)',
      reference: `CASH-${id}`,
      status: 'Paid',
      verified_at: now,
    });

    await supabaseAdmin.from('notifications').insert({
      recipient_role: 'owner',
      recipient_id: order.owner_id,
      title: 'Payment received',
      message: `${id}: buyer confirmed cash payment of ₹${order.total}.`,
    });

    res.json({ success: true, message: 'Cash payment confirmed.', order: updated });
  } catch (error) {
    next(error);
  }
};

export const submitPaymentProof = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { utr_reference, proof_url } = req.body;
    const buyerId = req.user.id;
    const now = new Date().toISOString();

    if (!utr_reference || !/^[A-Za-z0-9]{8,22}$/.test(utr_reference)) {
      return res.status(400).json({ success: false, message: 'Enter a valid 8-22 character UTR / reference.' });
    }

    if (!proof_url) {
      return res.status(400).json({ success: false, message: 'Payment screenshot is required.' });
    }

    if (!isSupabaseConfigured()) {
      const order = demoOrders.find((o) => o.id === id);
      if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });

      order.payment_status = 'Awaiting Verification';
      order.utr_reference = utr_reference;
      order.proof_url = proof_url;
      order.proof_submitted_at = now;

      demoBuyerPayments.push({
        id: 'BP-' + (2001 + demoBuyerPayments.length),
        order_id: id,
        owner_id: order.owner_id,
        buyer_id: buyerId,
        kind: 'online',
        amount: order.total,
        method: 'UPI QR',
        reference: utr_reference,
        proof_url,
        status: 'Pending Verification',
        submitted_at: now,
      });

      return res.json({ success: true, message: 'Payment proof submitted. Awaiting verification.', order });
    }

    const { data: order, error: fetchErr } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchErr || !order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    const { data: updated, error: updateErr } = await supabaseAdmin
      .from('orders')
      .update({
        payment_status: 'Awaiting Verification',
        utr_reference,
        proof_url,
        proof_submitted_at: now,
        updated_at: now,
      })
      .eq('id', id)
      .select()
      .single();

    if (updateErr) {
      return res.status(400).json({ success: false, message: updateErr.message });
    }

    const bpId = 'BP-' + (2001 + Math.floor(Math.random() * 9000));
    await supabaseAdmin.from('buyer_payments').insert({
      id: bpId,
      order_id: id,
      owner_id: order.owner_id,
      buyer_id: buyerId,
      kind: 'online',
      amount: order.total,
      method: 'UPI QR',
      reference: utr_reference,
      proof_url,
      status: 'Pending Verification',
    });

    await supabaseAdmin.from('notifications').insert({
      recipient_role: 'admin',
      recipient_id: null,
      title: 'Payment to verify',
      message: `${id} · ₹${order.total} · UTR: ${utr_reference}`,
    });

    res.json({ success: true, message: 'Payment proof submitted. Awaiting verification.', order: updated });
  } catch (error) {
    next(error);
  }
};
