const passwordService = {
  // Validar fortaleza de contraseña
  validarFortaleza: (password) => {
    const requisitos = {
      minimo8: password.length >= 8,
      mayuscula: /[A-Z]/.test(password),
      minuscula: /[a-z]/.test(password),
      numero: /\d/.test(password),
      especial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
    };

    const cumplidos = Object.values(requisitos).filter(v => v).length;
    const esValida = Object.values(requisitos).every(v => v);

    const mensajes = {
      minimo8: 'Mínimo 8 caracteres',
      mayuscula: 'Mínimo 1 letra mayúscula',
      minuscula: 'Mínimo 1 letra minúscula',
      numero: 'Mínimo 1 número',
      especial: 'Mínimo 1 carácter especial (!@#$%^&*)'
    };

    const faltantes = Object.entries(requisitos)
      .filter(([_, valor]) => !valor)
      .map(([key, _]) => mensajes[key]);

    return {
      esValida,
      cumplidos,
      totalRequisitos: 5,
      faltantes
    };
  },

  // Generar token random para recuperación
  generarToken: () => {
    const crypto = require('crypto');
    return crypto.randomBytes(32).toString('hex');
  },

  // Validar que contraseña no sea similar a anteriores (simulado)
  esContraseniaReutilizada: (nuevaPassword, passwordAnterior) => {
    // Implementación simple: no debe ser exactamente igual
    return nuevaPassword === passwordAnterior;
  }
};

module.exports = passwordService;
