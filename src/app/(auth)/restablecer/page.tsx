import { ResetPasswordForm } from "@neondatabase/auth/react/ui";
import { localizacionAuth } from "@/auth/localization";

// El enlace del email lleva el token en la URL; <ResetPasswordForm> lo lee solo.
// Es también la página de "alta de contraseña" para usuarios recién invitados.
export default function RestablecerPage() {
  return <ResetPasswordForm localization={localizacionAuth} />;
}
