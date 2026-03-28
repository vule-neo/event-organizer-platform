const { body, validationResult } = require('express-validator');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    return next();
  }
  return res.status(400).json({ 
    message: errors.array()[0].msg, // Vrati prvu grešku
    errors: errors.array() 
  });
};

const namePattern = /^[a-zA-ZàáâäãåąčćęèéêëėįìíîïłńòóôöõøùúûüųūÿýżźñçčšžÀÁÂÄÃÅĄČĆĘÈÉÊËĖĮÌÍÎÏŁŃÒÓÔÖÕØÙÚÛÜŲŪŸÝŻŹÑßÇŒÆČŠŽ∂ð ,.'-]+$/;

exports.registerValidation = [
  body('email').isEmail().withMessage('Unesite ispravan email.'),
  body('password').isLength({ min: 6 }).withMessage('Lozinka mora imati najmanje 6 karaktera.'),
  body('first_name')
    .trim()
    .notEmpty().withMessage('Ime je obavezno.')
    .matches(namePattern).withMessage('Ime ne smije sadržati brojeve ili specijalne znakove.'),
  body('last_name')
    .trim()
    .notEmpty().withMessage('Prezime je obavezno.')
    .matches(namePattern).withMessage('Prezime ne smije sadržati brojeve ili specijalne znakove.'),
  body('phone')
    .optional({ checkFalsy: true })
    .matches(/^[+]*[(]{0,1}[0-9]{1,4}[)]{0,1}[-\s\./0-9]*$/).withMessage('Neispravan format telefona.'),
  validate
];

exports.loginValidation = [
  body('email').isEmail().withMessage('Unesite ispravan email.'),
  body('password').notEmpty().withMessage('Lozinka je obavezna.'),
  validate
];

exports.updateProfileValidation = [
  body('first_name')
    .trim()
    .notEmpty().withMessage('Ime je obavezno.')
    .matches(namePattern).withMessage('Ime ne smije sadržati brojeve ili specijalne znakove.'),
  body('last_name')
    .trim()
    .notEmpty().withMessage('Prezime je obavezno.')
    .matches(namePattern).withMessage('Prezime ne smije sadržati brojeve ili specijalne znakove.'),
  body('phone')
    .optional({ checkFalsy: true })
    .matches(/^[+]*[(]{0,1}[0-9]{1,4}[)]{0,1}[-\s\./0-9]*$/).withMessage('Neispravan format telefona.'),
  validate
];
