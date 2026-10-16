import { supabase, supabaseAdmin, isSupabaseConfigured } from '../config/supabase.js';

// In-memory fallback product catalog for immediate preview before Supabase is connected
let demoProducts = [
  { id: 'P1', owner_id: 'u-owner-1', shop_name: 'Rajesh Stores', type: 'single', name: 'Basmati Rice 5kg', category: 'Groceries', image_url: '', emoji: '🍚', price: 499, stock: 40, original_quantity: 40, unit: 'pack', product_type: 'Packaged', package_size: 5, package_unit: 'kg', description: 'Long-grain aged rice.', discount_percent: 0, status: 'Active', location: 'Main store', created_at: new Date(Date.now() - 40 * 864e5).toISOString(), updated_at: new Date(Date.now() - 40 * 864e5).toISOString() },
  { id: 'P2', owner_id: 'u-owner-1', shop_name: 'Rajesh Stores', type: 'single', name: 'Cold-Press Olive Oil', category: 'Groceries', image_url: '', emoji: '🫒', price: 649, stock: 6, original_quantity: 6, unit: 'bottle', product_type: 'Packaged', package_size: 1, package_unit: 'L', description: 'Extra virgin, 1 litre.', discount_percent: 0, status: 'Active', location: 'Main store', created_at: new Date(Date.now() - 40 * 864e5).toISOString(), updated_at: new Date(Date.now() - 40 * 864e5).toISOString() },
  { id: 'P3', owner_id: 'u-owner-1', shop_name: 'Rajesh Stores', type: 'single', name: 'Herbal Tea Box', category: 'Ayurvedic Medicines', image_url: '', emoji: '🍵', price: 249, stock: 80, original_quantity: 80, unit: 'box', product_type: 'Packaged', package_size: 100, package_unit: 'g', description: 'Tulsi and ginger blend.', discount_percent: 0, status: 'Active', location: 'Main store', created_at: new Date(Date.now() - 40 * 864e5).toISOString(), updated_at: new Date(Date.now() - 40 * 864e5).toISOString() },
  { id: 'P4', owner_id: 'u-owner-1', shop_name: 'Rajesh Stores', type: 'single', name: 'Almond Pack 500g', category: 'Groceries', image_url: '', emoji: '🥜', price: 420, stock: 25, original_quantity: 25, unit: 'pack', product_type: 'Packaged', package_size: 500, package_unit: 'g', description: 'Raw California almonds.', discount_percent: 0, status: 'Active', location: 'Main store', created_at: new Date(Date.now() - 40 * 864e5).toISOString(), updated_at: new Date(Date.now() - 40 * 864e5).toISOString() },
  { id: 'P5', owner_id: 'u-owner-1', shop_name: 'Rajesh Stores', type: 'single', name: 'Steel Bottle 1L', category: 'Household Products', image_url: '', emoji: '🧴', price: 599, stock: 3, original_quantity: 3, unit: 'pcs', product_type: 'Packaged', package_size: 1, package_unit: 'pcs', description: 'Insulated, keeps cold 12h.', discount_percent: 0, status: 'Active', location: 'Main store', created_at: new Date(Date.now() - 40 * 864e5).toISOString(), updated_at: new Date(Date.now() - 40 * 864e5).toISOString() },
  { id: 'P6', owner_id: 'u-owner-2', shop_name: 'Meera Wellness', type: 'single', name: 'Ashwagandha Capsules', category: 'Ayurvedic Medicines', image_url: '', emoji: '🌿', price: 349, stock: 30, original_quantity: 30, unit: 'bottle', product_type: 'Herbal / Ayurvedic', package_size: 60, package_unit: 'pcs', description: '60 capsules, 500mg each.', discount_percent: 0, status: 'Active', location: 'Main store', created_at: new Date(Date.now() - 40 * 864e5).toISOString(), updated_at: new Date(Date.now() - 40 * 864e5).toISOString() },
  { id: 'P7', owner_id: 'u-owner-2', shop_name: 'Meera Wellness', type: 'single', name: 'Digital Thermometer', category: 'Other Medical Products', image_url: '', emoji: '🌡️', price: 299, stock: 18, original_quantity: 18, unit: 'pcs', product_type: 'Medical device', package_size: 1, package_unit: 'pcs', description: 'Fast reading, memory recall.', discount_percent: 0, status: 'Active', location: 'Main store', created_at: new Date(Date.now() - 40 * 864e5).toISOString(), updated_at: new Date(Date.now() - 40 * 864e5).toISOString() },
  { id: 'P8', owner_id: 'u-owner-2', shop_name: 'Meera Wellness', type: 'single', name: 'Floor Cleaner 1L', category: 'Household Products', image_url: '', emoji: '🧽', price: 189, stock: 50, original_quantity: 50, unit: 'bottle', product_type: 'Packaged', package_size: 1, package_unit: 'L', description: 'Citrus fragrance.', discount_percent: 0, status: 'Active', location: 'Main store', created_at: new Date(Date.now() - 40 * 864e5).toISOString(), updated_at: new Date(Date.now() - 40 * 864e5).toISOString() },
  { id: 'P9', owner_id: 'u-owner-2', shop_name: 'Meera Wellness', type: 'single', name: 'Honey Jar 500g', category: 'Groceries', image_url: '', emoji: '🍯', price: 340, stock: 55, original_quantity: 55, unit: 'jar', product_type: 'Packaged', package_size: 500, package_unit: 'g', description: 'Unprocessed forest honey.', discount_percent: 10, status: 'Active', location: 'Main store', created_at: new Date(Date.now() - 40 * 864e5).toISOString(), updated_at: new Date(Date.now() - 40 * 864e5).toISOString() },
  { id: 'P10', owner_id: 'u-owner-2', shop_name: 'Meera Wellness', type: 'single', name: 'Cotton Tote Bag', category: 'Other Categories', image_url: '', emoji: '👜', price: 199, stock: 30, original_quantity: 30, unit: 'pcs', product_type: 'Packaged', package_size: 1, package_unit: 'pcs', description: 'Reusable and washable.', discount_percent: 0, status: 'Active', location: 'Main store', created_at: new Date(Date.now() - 40 * 864e5).toISOString(), updated_at: new Date(Date.now() - 40 * 864e5).toISOString() },
  { id: 'P11', owner_id: 'u-owner-1', shop_name: 'Rajesh Stores', type: 'combo', name: 'Breakfast Bundle', category: 'Combos', image_url: '', emoji: '🎁', price: 699, stock: 15, original_quantity: 15, unit: 'package', product_type: 'Packaged', description: 'Tea, almonds and honey for a good morning.', discount_percent: 0, status: 'Active', location: 'Main store', created_at: new Date(Date.now() - 20 * 864e5).toISOString(), updated_at: new Date(Date.now() - 20 * 864e5).toISOString(), items: [{ name: 'Herbal Tea Box', quantity: 1, unit: 'box' }, { name: 'Almond Pack 500g', quantity: 1, unit: 'pack' }, { name: 'Honey Jar 500g', quantity: 1, unit: 'jar' }] },
  { id: 'P12', owner_id: 'u-owner-2', shop_name: 'Meera Wellness', type: 'combo', name: 'Wellness Combo', category: 'Combos', image_url: '', emoji: '💚', price: 899, stock: 10, original_quantity: 10, unit: 'package', product_type: 'Packaged', description: 'Ashwagandha, thermometer and tote.', discount_percent: 0, status: 'Active', location: 'Main store', created_at: new Date(Date.now() - 15 * 864e5).toISOString(), updated_at: new Date(Date.now() - 15 * 864e5).toISOString(), items: [{ name: 'Ashwagandha Capsules', quantity: 1, unit: 'bottle' }, { name: 'Digital Thermometer', quantity: 1, unit: 'pcs' }, { name: 'Cotton Tote Bag', quantity: 1, unit: 'pcs' }] },
];

let demoProductLogs = [];

export const listProducts = async (req, res, next) => {
  try {
    const { q, category, sort, owner_id, status } = req.query;

    if (!isSupabaseConfigured()) {
      let filtered = [...demoProducts];

      if (owner_id) {
        filtered = filtered.filter((p) => p.owner_id === owner_id);
      } else {
        // Public list: only active products from non-deleted status
        filtered = filtered.filter((p) => p.status === 'Active' && p.stock > 0);
      }

      if (status && status !== 'All') {
        filtered = filtered.filter((p) => p.status === status);
      }

      if (category && category !== 'All') {
        filtered = filtered.filter((p) => p.category === category);
      }

      if (q) {
        const query = q.toLowerCase();
        filtered = filtered.filter(
          (p) =>
            p.name.toLowerCase().includes(query) ||
            p.description.toLowerCase().includes(query) ||
            p.category.toLowerCase().includes(query)
        );
      }

      if (sort === 'Price: low to high') {
        filtered.sort((a, b) => a.price * (1 - (a.discount_percent || 0) / 100) - b.price * (1 - (b.discount_percent || 0) / 100));
      } else if (sort === 'Price: high to low') {
        filtered.sort((a, b) => b.price * (1 - (b.discount_percent || 0) / 100) - a.price * (1 - (a.discount_percent || 0) / 100));
      } else if (sort === 'Name') {
        filtered.sort((a, b) => a.name.localeCompare(b.name));
      } else {
        filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      }

      return res.json({ success: true, count: filtered.length, products: filtered });
    }

    // Query from Supabase
    let query = supabaseAdmin
      .from('products')
      .select('*, profiles:owner_id(shop_name, full_name, status, store_status, store_pause_message)');

    if (owner_id) {
      query = query.eq('owner_id', owner_id);
    } else {
      query = query.eq('status', 'Active').gt('stock', 0);
    }

    if (status && status !== 'All') {
      query = query.eq('status', status);
    }

    if (category && category !== 'All') {
      query = query.eq('category', category);
    }

    if (q) {
      query = query.or(`name.ilike.%${q}%,description.ilike.%${q}%,category.ilike.%${q}%`);
    }

    if (sort === 'Price: low to high') {
      query = query.order('price', { ascending: true });
    } else if (sort === 'Price: high to low') {
      query = query.order('price', { ascending: false });
    } else if (sort === 'Name') {
      query = query.order('name', { ascending: true });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    const { data: products, error } = await query;

    if (error) {
      return res.status(400).json({ success: false, message: error.message });
    }

    res.json({ success: true, count: products.length, products });
  } catch (error) {
    next(error);
  }
};

export const getProduct = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isSupabaseConfigured()) {
      const product = demoProducts.find((p) => p.id === id);
      if (!product) {
        return res.status(404).json({ success: false, message: 'Product not found.' });
      }
      return res.json({ success: true, product });
    }

    const { data: product, error } = await supabaseAdmin
      .from('products')
      .select('*, combo_items(*), profiles:owner_id(shop_name, full_name, status, store_status, store_pause_message)')
      .eq('id', id)
      .single();

    if (error || !product) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    res.json({ success: true, product });
  } catch (error) {
    next(error);
  }
};

export const createProduct = async (req, res, next) => {
  try {
    const ownerId = req.user.id;
    const {
      name,
      category,
      type,
      image_url,
      description,
      product_type,
      price,
      stock,
      package_size,
      package_unit,
      unit,
      expiry_date,
      brand,
      discount_percent,
      location,
      status,
      items, // array of combo items if type === 'combo'
    } = req.body;

    if (!name || price === undefined || stock === undefined) {
      return res.status(400).json({ success: false, message: 'Product name, price, and stock are required.' });
    }

    const newId = 'P' + (Date.now() % 100000);

    if (!isSupabaseConfigured()) {
      const newProduct = {
        id: newId,
        owner_id: ownerId,
        shop_name: req.user.shop_name || 'My Shop',
        type: type || 'single',
        name,
        category: category || 'Groceries',
        image_url: image_url || '',
        emoji: '📦',
        price: Number(price),
        stock: Number(stock),
        original_quantity: Number(stock),
        package_size: Number(package_size) || 0,
        package_unit: package_unit || '',
        unit: unit || 'pcs',
        product_type: product_type || 'Packaged',
        description: description || '',
        expiry_date: expiry_date || null,
        brand: brand || '',
        discount_percent: Number(discount_percent) || 0,
        location: location || 'Main store',
        status: status || 'Active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        items: items || [],
      };
      demoProducts.push(newProduct);
      demoProductLogs.push({
        id: 'log-' + Date.now(),
        product_id: newId,
        kind: 'Created',
        details: `Added with quantity ${stock}`,
        quantity_delta: Number(stock),
        created_at: new Date().toISOString(),
      });
      return res.status(201).json({ success: true, message: 'Product created successfully.', product: newProduct });
    }

    // Insert into Supabase products table
    const { data: product, error: prodError } = await supabaseAdmin
      .from('products')
      .insert({
        id: newId,
        owner_id: ownerId,
        type: type || 'single',
        name,
        category: category || 'Groceries',
        image_url: image_url || null,
        description: description || '',
        product_type: product_type || 'Packaged',
        price: Number(price),
        stock: Number(stock),
        original_quantity: Number(stock),
        package_size: Number(package_size) || 0,
        package_unit: package_unit || null,
        unit: unit || 'pcs',
        expiry_date: expiry_date || null,
        brand: brand || null,
        discount_percent: Number(discount_percent) || 0,
        location: location || 'Main store',
        status: status || 'Active',
      })
      .select()
      .single();

    if (prodError) {
      return res.status(400).json({ success: false, message: prodError.message });
    }

    // Insert combo items if combo
    if (type === 'combo' && Array.isArray(items) && items.length > 0) {
      const comboRecords = items.map((it) => ({
        product_id: newId,
        name: it.name,
        category: it.category || 'Combos',
        image_url: it.image_url || null,
        description: it.description || '',
        quantity: Number(it.quantity) || 1,
        unit: it.unit || 'pcs',
      }));
      await supabaseAdmin.from('combo_items').insert(comboRecords);
    }

    // Record in product_logs
    await supabaseAdmin.from('product_logs').insert({
      product_id: newId,
      kind: 'Created',
      details: `Added with quantity ${stock}`,
      quantity_delta: Number(stock),
    });

    res.status(201).json({ success: true, message: 'Product added successfully.', product });
  } catch (error) {
    next(error);
  }
};

export const updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      image_url,
      price,
      stock,
      reason,
      location,
      status,
    } = req.body;

    if (!isSupabaseConfigured()) {
      const product = demoProducts.find((p) => p.id === id);
      if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });

      const stockDelta = Number(stock) - Number(product.stock);
      if (stockDelta !== 0 && (!reason || reason.trim().length < 3)) {
        return res.status(400).json({ success: false, message: 'A valid reason is required for any quantity change.' });
      }

      if (name) product.name = name;
      if (description) product.description = description;
      if (image_url) product.image_url = image_url;
      if (price !== undefined) product.price = Number(price);
      if (stock !== undefined) product.stock = Number(stock);
      if (location) product.location = location;
      if (status) product.status = status;
      product.updated_at = new Date().toISOString();

      if (stockDelta !== 0) {
        demoProductLogs.push({
          id: 'log-' + Date.now(),
          product_id: id,
          kind: stockDelta > 0 ? 'Quantity increased' : 'Quantity decreased',
          details: `Quantity changed from ${product.stock - stockDelta} to ${product.stock}. Reason: ${reason}`,
          quantity_delta: stockDelta,
          created_at: new Date().toISOString(),
        });
      }

      return res.json({ success: true, message: 'Product updated successfully.', product });
    }

    // Get current product to calculate delta
    const { data: current, error: fetchErr } = await supabaseAdmin
      .from('products')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchErr || !current) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    const stockDelta = Number(stock) - Number(current.stock);
    if (stockDelta !== 0 && (!reason || reason.trim().length < 3)) {
      return res.status(400).json({ success: false, message: 'A valid reason is required for any quantity change.' });
    }

    const { data: updated, error: updateErr } = await supabaseAdmin
      .from('products')
      .update({
        name: name || current.name,
        description: description !== undefined ? description : current.description,
        image_url: image_url || current.image_url,
        price: price !== undefined ? Number(price) : current.price,
        stock: stock !== undefined ? Number(stock) : current.stock,
        location: location || current.location,
        status: status || current.status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateErr) {
      return res.status(400).json({ success: false, message: updateErr.message });
    }

    // Record stock log if changed
    if (stockDelta !== 0) {
      await supabaseAdmin.from('product_logs').insert({
        product_id: id,
        kind: stockDelta > 0 ? 'Quantity increased' : 'Quantity decreased',
        details: `Quantity changed from ${current.stock} to ${stock}. Reason: ${reason}`,
        quantity_delta: stockDelta,
      });
    }

    res.json({ success: true, message: 'Product updated successfully.', product: updated });
  } catch (error) {
    next(error);
  }
};

export const updateStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['Active', 'Disabled', 'Deleted'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value.' });
    }

    if (!isSupabaseConfigured()) {
      const product = demoProducts.find((p) => p.id === id);
      if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });
      product.status = status;
      product.updated_at = new Date().toISOString();
      demoProductLogs.push({
        id: 'log-' + Date.now(),
        product_id: id,
        kind: 'Status',
        details: `Status changed to ${status}`,
        quantity_delta: 0,
        created_at: new Date().toISOString(),
      });
      return res.json({ success: true, message: `Product status changed to ${status}.`, product });
    }

    const { data: updated, error } = await supabaseAdmin
      .from('products')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ success: false, message: error.message });
    }

    await supabaseAdmin.from('product_logs').insert({
      product_id: id,
      kind: 'Status',
      details: `Status changed to ${status}`,
      quantity_delta: 0,
    });

    res.json({ success: true, message: `Product status changed to ${status}.`, product: updated });
  } catch (error) {
    next(error);
  }
};

export const getProductHistory = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isSupabaseConfigured()) {
      const logs = demoProductLogs.filter((l) => l.product_id === id);
      return res.json({ success: true, logs });
    }

    const { data: logs, error } = await supabaseAdmin
      .from('product_logs')
      .select('*')
      .eq('product_id', id)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(400).json({ success: false, message: error.message });
    }

    res.json({ success: true, logs });
  } catch (error) {
    next(error);
  }
};
