/**
 * Request validation utilities
 */

export const validateRequired = (fields) => {
  return (req, res, next) => {
    const missing = [];
    for (const field of fields) {
      if (req.body[field] === undefined || req.body[field] === null || String(req.body[field]).trim() === '') {
        missing.push(field);
      }
    }

    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required field(s): ${missing.join(', ')}`,
      });
    }

    next();
  };
};

export const isValidEmail = (email) => {
  return /^\S+@\S+\.\S+$/.test(email);
};

export const isValidMobile = (mobile) => {
  return /^\d{10}$/.test(mobile);
};

export const isValidPincode = (pin) => {
  return /^\d{6}$/.test(pin);
};
