/**
 * Traducción al español de los componentes de UI de Neon Auth.
 * Solo sobreescribimos las claves que usan nuestros flujos (login, recuperar /
 * restablecer contraseña, cambiar contraseña). El resto cae al inglés por
 * defecto, lo cual es inofensivo porque no se muestran.
 */
export const localizacionAuth = {
  // Acceso
  SIGN_IN: "Iniciar sesión",
  SIGN_IN_ACTION: "Entrar",
  SIGN_IN_DESCRIPTION: "Introduce tu email para entrar en tu cuenta",
  SIGN_OUT: "Cerrar sesión",

  // Campos comunes
  EMAIL: "Email",
  EMAIL_PLACEHOLDER: "tu@email.com",
  EMAIL_REQUIRED: "El email es obligatorio",
  EMAIL_INSTRUCTIONS: "Introduce un email válido.",
  PASSWORD: "Contraseña",
  PASSWORD_PLACEHOLDER: "Contraseña",
  PASSWORD_REQUIRED: "La contraseña es obligatoria",

  // Recuperar contraseña
  FORGOT_PASSWORD: "He olvidado mi contraseña",
  FORGOT_PASSWORD_ACTION: "Enviar enlace de recuperación",
  FORGOT_PASSWORD_DESCRIPTION:
    "Introduce tu email para restablecer tu contraseña",
  FORGOT_PASSWORD_EMAIL:
    "Revisa tu email: te hemos enviado el enlace para restablecer la contraseña.",
  FORGOT_PASSWORD_LINK: "¿Has olvidado tu contraseña?",

  // Restablecer contraseña (desde el enlace del email)
  RESET_PASSWORD: "Restablecer contraseña",
  RESET_PASSWORD_ACTION: "Guardar nueva contraseña",
  RESET_PASSWORD_DESCRIPTION: "Escribe tu nueva contraseña",
  RESET_PASSWORD_SUCCESS: "Contraseña restablecida correctamente",

  // Cambiar contraseña (ya con sesión)
  CHANGE_PASSWORD: "Cambiar contraseña",
  CHANGE_PASSWORD_DESCRIPTION:
    "Introduce tu contraseña actual y una nueva contraseña.",
  CHANGE_PASSWORD_INSTRUCTIONS: "Usa al menos 8 caracteres.",
  CHANGE_PASSWORD_SUCCESS: "Tu contraseña se ha cambiado.",
  CURRENT_PASSWORD: "Contraseña actual",
  CURRENT_PASSWORD_PLACEHOLDER: "Contraseña actual",
  NEW_PASSWORD: "Nueva contraseña",
  NEW_PASSWORD_PLACEHOLDER: "Nueva contraseña",
  NEW_PASSWORD_REQUIRED: "La nueva contraseña es obligatoria",
  CONFIRM_PASSWORD: "Confirmar contraseña",
  CONFIRM_PASSWORD_PLACEHOLDER: "Confirmar contraseña",
  CONFIRM_PASSWORD_REQUIRED: "Debes confirmar la contraseña",
  SET_PASSWORD: "Establecer contraseña",

  // Botones genéricos
  NAME: "Nombre",
  ACCOUNT: "Cuenta",
  SETTINGS: "Ajustes",
  SECURITY: "Seguridad",
  SAVE: "Guardar",
  CANCEL: "Cancelar",
  CONTINUE: "Continuar",
  DONE: "Hecho",
  GO_BACK: "Volver",

  // Errores frecuentes
  INVALID_EMAIL_OR_PASSWORD: "Email o contraseña incorrectos",
};
