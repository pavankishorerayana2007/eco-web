import React, { useState } from 'react';
import { api } from '../../services/api';

const CATEGORIES = [
  'Groceries',
  'Ayurvedic Medicines',
  'Other Medical Products',
  'Household Products',
  'Other Categories',
];

const PRODUCT_TYPES = [
  'Packaged',
  'Loose / Weighted',
  'Perishable',
  'Herbal / Ayurvedic',
  'Medical device',
  'Other',
];

const PACKAGE_UNITS = ['ml', 'L', 'g', 'kg', 'pcs'];
const MEASUREMENT_UNITS = ['pcs', 'kg', 'g', 'L', 'ml', 'pack', 'box', 'bottle', 'jar', 'set'];

export const AddProduct = ({ onNavigate, onToast }) => {
  const [mode, setMode] = useState(null); // null, 'single', 'combo'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Single product state
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Groceries');
  const [image, setImage] = useState('');
  const [description, setDescription] = useState('');
  const [productType, setProductType] = useState('Packaged');
  const [packageSize, setPackageSize] = useState('');
  const [packageUnit, setPackageUnit] = useState('ml');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [unit, setUnit] = useState('pcs');
  const [expiryDate, setExpiryDate] = useState('');
  const [brand, setBrand] = useState('');
  const [discountPercent, setDiscountPercent] = useState('0');
  const [location, setLocation] = useState('Main store');
  const [status, setStatus] = useState('Active');

  // Combo product wizard state
  const [comboStep, setComboStep] = useState(1);
  const [comboName, setComboName] = useState('');
  const [comboCount, setComboCount] = useState(3);
  const [comboDesc, setComboDesc] = useState('');
  const [comboImage, setComboImage] = useState('');
  const [comboPrice, setComboPrice] = useState('');
  const [comboStock, setComboStock] = useState('');
  const [comboItems, setComboItems] = useState([]);

  const handleImageFile = (e, callback) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > 2 * 1024 * 1024) {
      onToast('Choose an image file under 2 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => callback(reader.result);
    reader.readAsDataURL(file);
  };

  const handleSaveSingle = async (e) => {
    e.preventDefault();
    if (!name || name.trim().length < 2) {
      setError('Please enter a product name (2+ characters).');
      return;
    }
    if (!description || description.trim().length < 10) {
      setError('Please provide a description (10+ characters).');
      return;
    }
    if (!price || Number(price) <= 0) {
      setError('Please enter a valid price above 0.');
      return;
    }
    if (stock === '' || Number(stock) < 0) {
      setError('Please enter an available stock quantity (0 or more).');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await api.products.create({
        type: 'single',
        name,
        category,
        image_url: image,
        description,
        product_type: productType,
        package_size: productType === 'Packaged' ? Number(packageSize) : 0,
        package_unit: productType === 'Packaged' ? packageUnit : '',
        price: Number(price),
        stock: Number(stock),
        unit: productType === 'Loose / Weighted' ? (unit || 'kg') : unit,
        expiry_date: expiryDate || null,
        brand: brand || null,
        discount_percent: Number(discountPercent) || 0,
        location,
        status,
      });

      if (res.success) {
        onToast('Product added successfully!');
        onNavigate('hist');
      }
    } catch (err) {
      setError(err.message || 'Failed to create product.');
    } finally {
      setLoading(false);
    }
  };

  const handleComboStep1 = (e) => {
    e.preventDefault();
    if (!comboName || comboName.trim().length < 2) {
      setError('Please enter a combo name.');
      return;
    }
    if (comboCount < 2 || comboCount > 8) {
      setError('Number of products must be between 2 and 8.');
      return;
    }
    if (!comboDesc || comboDesc.trim().length < 10) {
      setError('Please enter a combo description (10+ characters).');
      return;
    }
    if (!comboPrice || Number(comboPrice) <= 0) {
      setError('Please enter a valid selling price.');
      return;
    }
    if (!comboStock || Number(comboStock) <= 0) {
      setError('Please enter available combo packages.');
      return;
    }

    // Initialize items array if needed
    const initialItems = [...Array(Number(comboCount)).keys()].map((i) => ({
      name: comboItems[i]?.name || '',
      category: comboItems[i]?.category || 'Groceries',
      image_url: comboItems[i]?.image_url || '',
      description: comboItems[i]?.description || '',
      quantity: comboItems[i]?.quantity || 1,
      unit: comboItems[i]?.unit || 'pcs',
    }));

    setComboItems(initialItems);
    setError('');
    setComboStep(2);
  };

  const handleComboItemChange = (index, field, value) => {
    setComboItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleComboStep2 = (e) => {
    e.preventDefault();
    for (let i = 0; i < comboItems.length; i++) {
      if (!comboItems[i].name || comboItems[i].name.trim().length < 2) {
        setError(`Please enter a valid name for Product ${i + 1}.`);
        return;
      }
    }
    setError('');
    setComboStep(3);
  };

  const handleSaveCombo = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await api.products.create({
        type: 'combo',
        name: comboName,
        category: 'Combos',
        image_url: comboImage,
        description: comboDesc,
        price: Number(comboPrice),
        stock: Number(comboStock),
        unit: 'package',
        status: 'Active',
        items: comboItems,
      });

      if (res.success) {
        onToast('Combo placed successfully!');
        onNavigate('hist');
      }
    } catch (err) {
      setError(err.message || 'Failed to place combo.');
    } finally {
      setLoading(false);
    }
  };

  if (!mode) {
    return (
      <div>
        <h1>Add Product</h1>
        <div className="grid">
          <div className="card" style={{ padding: '18px' }}>
            <div style={{ fontSize: '40px' }}>📦</div>
            <h2>Single Product</h2>
            <p className="sm" style={{ margin: '6px 0 12px' }}>
              One item with its own price, stock, and unit of measurement.
            </p>
            <button className="b" onClick={() => setMode('single')}>
              Single Product
            </button>
          </div>

          <div className="card" style={{ padding: '18px' }}>
            <div style={{ fontSize: '40px' }}>🎁</div>
            <h2>Combo Product</h2>
            <p className="sm" style={{ margin: '6px 0 12px' }}>
              A bundle of several items sold together at one promotional price.
            </p>
            <button
              className="b"
              onClick={() => {
                setMode('combo');
                setComboStep(1);
              }}
            >
              Combo Product
            </button>
          </div>
        </div>
      </div>
    );
  }

  // SINGLE PRODUCT FORM
  if (mode === 'single') {
    return (
      <div>
        <h1>Add Single Product</h1>
        <div className="pn">
          <form onSubmit={handleSaveSingle}>
            <div className="fg">
              <label htmlFor="s_n">
                Product name <i className="rq">*</i>
              </label>
              <input
                id="s_n"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Basmati Rice 5kg"
              />
            </div>

            <div className="fg">
              <label htmlFor="s_c">Category</label>
              <select id="s_c" value={category} onChange={(e) => setCategory(e.target.value)}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="fg">
              <label htmlFor="s_img">Product image</label>
              <input
                id="s_img"
                type="file"
                accept="image/*"
                onChange={(e) => handleImageFile(e, setImage)}
              />
              {image && (
                <img
                  src={image}
                  alt="Preview"
                  style={{ height: '60px', borderRadius: '8px', marginTop: '6px' }}
                />
              )}
            </div>

            <div className="fg">
              <label htmlFor="s_d">
                Description <i className="rq">*</i>
              </label>
              <textarea
                id="s_d"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Product details, origins, ingredients..."
              />
            </div>

            <div className="fg">
              <label htmlFor="s_t">Product type</label>
              <select id="s_t" value={productType} onChange={(e) => setProductType(e.target.value)}>
                {PRODUCT_TYPES.map((pt) => (
                  <option key={pt} value={pt}>
                    {pt}
                  </option>
                ))}
              </select>
            </div>

            {productType === 'Packaged' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div className="fg">
                  <label htmlFor="s_ps">Package size</label>
                  <input
                    id="s_ps"
                    value={packageSize}
                    onChange={(e) => setPackageSize(e.target.value)}
                    placeholder="e.g. 500"
                  />
                </div>
                <div className="fg">
                  <label htmlFor="s_pu">Package unit</label>
                  <select id="s_pu" value={packageUnit} onChange={(e) => setPackageUnit(e.target.value)}>
                    {PACKAGE_UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div className="fg">
              <label htmlFor="s_p">
                {productType === 'Packaged'
                  ? 'Price per package (₹)'
                  : productType === 'Loose / Weighted'
                  ? `Price per ${unit} (₹)`
                  : 'Unit price (₹)'}{' '}
                <i className="rq">*</i>
              </label>
              <input
                id="s_p"
                type="number"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="299.00"
              />
            </div>

            <div className="fg">
              <label htmlFor="s_s">
                {productType === 'Loose / Weighted'
                  ? `Available quantity (${unit})`
                  : 'Available stock quantity'}{' '}
                <i className="rq">*</i>
              </label>
              <input
                id="s_s"
                type="number"
                step={productType === 'Loose / Weighted' ? '0.001' : '1'}
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                placeholder="25"
              />
            </div>

            <div className="fg">
              <label htmlFor="s_u">Unit of measurement</label>
              <select id="s_u" value={unit} onChange={(e) => setUnit(e.target.value)}>
                {MEASUREMENT_UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>

            <div className="fg">
              <label htmlFor="s_dc">Discount % (optional)</label>
              <input
                id="s_dc"
                type="number"
                value={discountPercent}
                onChange={(e) => setDiscountPercent(e.target.value)}
                placeholder="0"
                max={90}
              />
            </div>

            <div className="fg">
              <label htmlFor="s_l">Storage Location</label>
              <input id="s_l" value={location} onChange={(e) => setLocation(e.target.value)} />
            </div>

            <div className="fg">
              <label htmlFor="s_a">Availability</label>
              <select id="s_a" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="Active">Active</option>
                <option value="Disabled">Inactive / Disabled</option>
              </select>
            </div>

            {error && (
              <div className="er" style={{ marginBottom: '10px' }}>
                {error}
              </div>
            )}

            <button className="b" type="submit" disabled={loading} style={{ width: '100%' }}>
              {loading ? <span className="sp"></span> : null}
              Confirm / Add Product
            </button>
            <button
              className="o"
              type="button"
              style={{ width: '100%', marginTop: '8px' }}
              onClick={() => setMode(null)}
            >
              Back
            </button>
          </form>
        </div>
      </div>
    );
  }

  // COMBO WIZARD STEP 1
  if (mode === 'combo' && comboStep === 1) {
    return (
      <div>
        <h1>Combo · Step 1 of 3</h1>
        <div className="pn">
          <form onSubmit={handleComboStep1}>
            <div className="fg">
              <label htmlFor="c_n">
                Combo name <i className="rq">*</i>
              </label>
              <input
                id="c_n"
                value={comboName}
                onChange={(e) => setComboName(e.target.value)}
                placeholder="Breakfast Bundle"
              />
            </div>

            <div className="fg">
              <label htmlFor="c_k">
                Number of products included (2–8) <i className="rq">*</i>
              </label>
              <input
                id="c_k"
                type="number"
                min={2}
                max={8}
                value={comboCount}
                onChange={(e) => setComboCount(e.target.value)}
              />
            </div>

            <div className="fg">
              <label htmlFor="c_d">
                Combo description <i className="rq">*</i>
              </label>
              <textarea
                id="c_d"
                rows={3}
                value={comboDesc}
                onChange={(e) => setComboDesc(e.target.value)}
                placeholder="Tea, almonds, and honey for a great morning"
              />
            </div>

            <div className="fg">
              <label htmlFor="c_img">Combo image</label>
              <input
                id="c_img"
                type="file"
                accept="image/*"
                onChange={(e) => handleImageFile(e, setComboImage)}
              />
              {comboImage && (
                <img
                  src={comboImage}
                  alt="Combo preview"
                  style={{ height: '60px', borderRadius: '8px', marginTop: '6px' }}
                />
              )}
            </div>

            <div className="fg">
              <label htmlFor="c_p">
                Combo selling price (₹) <i className="rq">*</i>
              </label>
              <input
                id="c_p"
                type="number"
                step="0.01"
                value={comboPrice}
                onChange={(e) => setComboPrice(e.target.value)}
                placeholder="699.00"
              />
            </div>

            <div className="fg">
              <label htmlFor="c_s">
                Available combo packages <i className="rq">*</i>
              </label>
              <input
                id="c_s"
                type="number"
                value={comboStock}
                onChange={(e) => setComboStock(e.target.value)}
                placeholder="15"
              />
            </div>

            {error && (
              <div className="er" style={{ marginBottom: '10px' }}>
                {error}
              </div>
            )}

            <button className="b" type="submit" style={{ width: '100%' }}>
              Next: item details
            </button>
            <button
              className="o"
              type="button"
              style={{ width: '100%', marginTop: '8px' }}
              onClick={() => setMode(null)}
            >
              Cancel
            </button>
          </form>
        </div>
      </div>
    );
  }

  // COMBO WIZARD STEP 2
  if (mode === 'combo' && comboStep === 2) {
    return (
      <div>
        <h1>Combo · Step 2 of 3</h1>
        <p className="sm" style={{ marginBottom: '10px' }}>
          Enter details for each of the {comboCount} products in this bundle.
        </p>

        <form onSubmit={handleComboStep2}>
          {comboItems.map((item, idx) => (
            <div key={idx} className="pn">
              <h2 style={{ marginBottom: '10px' }}>Product {idx + 1}</h2>
              <div className="fg">
                <label>
                  Product name <i className="rq">*</i>
                </label>
                <input
                  value={item.name}
                  onChange={(e) => handleComboItemChange(idx, 'name', e.target.value)}
                  placeholder="e.g. Herbal Tea Box"
                />
              </div>

              <div className="fg">
                <label>Category</label>
                <select
                  value={item.category}
                  onChange={(e) => handleComboItemChange(idx, 'category', e.target.value)}
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="fg">
                <label>Quantity in one combo</label>
                <input
                  type="number"
                  value={item.quantity}
                  onChange={(e) => handleComboItemChange(idx, 'quantity', e.target.value)}
                />
              </div>

              <div className="fg">
                <label>Unit of measurement</label>
                <select
                  value={item.unit}
                  onChange={(e) => handleComboItemChange(idx, 'unit', e.target.value)}
                >
                  {MEASUREMENT_UNITS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))}

          {error && (
            <div className="er" style={{ marginBottom: '10px' }}>
              {error}
            </div>
          )}

          <button className="b" type="submit" style={{ width: '100%' }}>
            Next: review combo
          </button>
          <button
            className="o"
            type="button"
            style={{ width: '100%', marginTop: '8px' }}
            onClick={() => setComboStep(1)}
          >
            Back
          </button>
        </form>
      </div>
    );
  }

  // COMBO WIZARD STEP 3 (Review & Place)
  if (mode === 'combo' && comboStep === 3) {
    return (
      <div>
        <h1>Combo · Review</h1>
        <div className="pn">
          <h2>{comboName}</h2>
          <p>{comboDesc}</p>
          <p style={{ margin: '8px 0' }}>
            <b>Price:</b> ₹{comboPrice} · <b>Packages:</b> {comboStock}
          </p>

          <h3 style={{ marginTop: '14px', marginBottom: '8px' }}>Included items:</h3>
          {comboItems.map((it, idx) => (
            <div key={idx} className="ln">
              <div className="im"><span>📦</span></div>
              <div className="n">
                <b>
                  {idx + 1}. {it.name}
                </b>
                <br />
                <span className="sm">
                  {it.category} · {it.quantity} {it.unit} per combo
                </span>
              </div>
            </div>
          ))}

          {error && (
            <div className="er" style={{ margin: '10px 0' }}>
              {error}
            </div>
          )}

          <button
            className="b"
            style={{ width: '100%', marginTop: '16px' }}
            disabled={loading}
            onClick={handleSaveCombo}
          >
            {loading ? <span className="sp"></span> : null}
            Place Combo
          </button>

          <button
            className="o"
            style={{ width: '100%', marginTop: '8px' }}
            onClick={() => setComboStep(2)}
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  return null;
};
