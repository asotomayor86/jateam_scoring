import { ChangePasswordCard } from "@neondatabase/auth/react/ui";
import { SeccionTitulo } from "@/components/ui";
import { localizacionAuth } from "@/auth/localization";

// El cambio de contraseña con sesión iniciada lo gestiona el componente de Neon Auth.
export default function CambiarPasswordPage() {
  return (
    <>
      <SeccionTitulo grande>Cambiar contraseña</SeccionTitulo>
      <ChangePasswordCard localization={localizacionAuth} />
    </>
  );
}
