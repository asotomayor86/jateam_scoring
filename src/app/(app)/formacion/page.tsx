import type { ReactNode } from "react";
import { requireUser } from "@/auth/helpers";
import { SeccionTitulo } from "@/components/ui";

export const dynamic = "force-dynamic";

function Tema({
  titulo,
  children,
  abierto = false,
}: {
  titulo: string;
  children: ReactNode;
  abierto?: boolean;
}) {
  return (
    <details open={abierto}>
      <summary>{titulo}</summary>
      <div className="cuerpo">{children}</div>
    </details>
  );
}

export default async function FormacionPage() {
  await requireUser();

  return (
    <div className="guia">
      <SeccionTitulo grande>Formación APP</SeccionTitulo>
      <p style={{ color: "var(--texto-suave)", fontSize: "0.9rem", margin: "0 0 1rem" }}>
        Guía de uso de la aplicación, del nivel básico al avanzado. Despliega cada
        apartado para leer el detalle.
      </p>

      {/* ---------------------- NIVEL BÁSICO ---------------------- */}
      <SeccionTitulo>1 · Primeros pasos</SeccionTitulo>

      <Tema titulo="Qué es la app" abierto>
        <p>
          Es la herramienta del grupo para <strong>apuntar tiradas y
          entrenamientos</strong> de tiro, dejarlos registrados y{" "}
          <strong>compararse</strong> entre todos. También sirve de{" "}
          <strong>libreta en vivo</strong> durante la tirada (con cronómetros) y
          organiza <strong>comidas</strong>, <strong>campos</strong>,{" "}
          <strong>ejercicios</strong> y un <strong>calendario</strong> común.
        </p>
        <p>
          Está pensada para el <strong>móvil</strong>: puedes instalarla como app
          en la pantalla de inicio (ver «Instalar la app»).
        </p>
      </Tema>

      <Tema titulo="Acceso y contraseña">
        <p>
          No hay registro abierto: se entra <strong>por invitación</strong>. El
          encargado te crea la cuenta y recibes un email para poner tu contraseña.
        </p>
        <ul>
          <li>Entra en <strong>Login</strong> con tu email y contraseña.</li>
          <li>
            Si la olvidas, usa <strong>«He olvidado mi contraseña»</strong>; te
            llega un enlace para restablecerla.
          </li>
          <li>Puedes cambiarla desde <strong>Perfil → Cambiar contraseña</strong>.</li>
        </ul>
      </Tema>

      <Tema titulo="Moverte por la app (menú)">
        <p>
          Arriba a la derecha está el <strong>botón de menú</strong> (☰). Al
          pulsarlo se despliega con todas las secciones: Inicio, Formación,
          Calendario, Tiradas y Entrenamientos, Mis tiradas, Ejercicios, Campos,
          Comidas, Restaurantes, Perfil (y Miembros, solo para el encargado).
        </p>
        <p>
          Arriba a la derecha del menú también tienes el botón de{" "}
          <strong>tema claro/oscuro</strong> (☀️/🌙).
        </p>
      </Tema>

      <Tema titulo="Tu perfil">
        <p>En <strong>Perfil</strong> configuras:</p>
        <ul>
          <li><strong>Nombre</strong> y <strong>apodo</strong> (cómo apareces en los rankings).</li>
          <li><strong>DNI</strong> y <strong>nº de licencia</strong> (para tiradas oficiales).</li>
          <li>
            <strong>Modo de apunte por defecto</strong>: cómo prefieres rellenar la
            libreta (ver «La libreta»).
          </li>
        </ul>
      </Tema>

      <Tema titulo="Inicio y Calendario">
        <p>
          <strong>Inicio</strong> muestra tu portada y los{" "}
          <strong>próximos eventos</strong> (tiradas y comidas que aún no han
          pasado).
        </p>
        <p>
          <strong>Calendario</strong> reúne todos los eventos en dos vistas:
        </p>
        <ul>
          <li><strong>Lista</strong>: próximas y pasadas.</li>
          <li>
            <strong>Calendario</strong>: rejilla mensual; la semana en curso se
            resalta y puedes pulsar un día para ver sus eventos.
          </li>
        </ul>
        <p>
          Cada evento tiene un color: <strong>oficial</strong> (rojo),{" "}
          <strong>semioficial</strong> (ámbar), <strong>entrenamiento</strong>{" "}
          (verde) y <strong>comida</strong> (azul). «Pasado» se calcula por la
          hora de inicio real.
        </p>
      </Tema>

      {/* ---------------------- NIVEL INTERMEDIO ---------------------- */}
      <SeccionTitulo>2 · Tiradas, libreta y eventos</SeccionTitulo>

      <Tema titulo="Tipos de tirada">
        <ul>
          <li><strong>Entrenamiento</strong>: práctica personal o de grupo.</li>
          <li><strong>Semioficial</strong>: tirada «seria» entre nosotros.</li>
          <li><strong>Oficial</strong>: competición; al apuntarte eliges categoría.</li>
        </ul>
      </Tema>

      <Tema titulo="Crear una tirada">
        <p>
          En <strong>Tiradas y Entrenamientos → + Nueva</strong> (o desde Inicio).
          Rellenas fecha, hora, modalidad, campo, tipo, calibre (opcional) y notas.
          El <strong>identificador se genera solo</strong> (fecha-modalidad-campo-tipo),
          así todas tienen la misma estructura.
        </p>
        <p>
          Casilla <strong>Público</strong>: si la desmarcas, la tirada es{" "}
          <strong>privada</strong> y solo la ves y te apuntas tú (útil para
          entrenamientos personales).
        </p>
        <p>Cualquiera puede crear tiradas; quien la crea (o el encargado) la edita, cierra o borra.</p>
      </Tema>

      <Tema titulo="Apuntarte y el ranking">
        <p>
          En el detalle de la tirada pulsa <strong>Apuntarme</strong>. Eliges{" "}
          <strong>cómo quieres apuntar</strong> (modo de libreta) y, en las
          oficiales, tu <strong>categoría</strong> (1ª/2ª/3ª/Veterano/Damas).
        </p>
        <p>
          El <strong>ranking</strong> ordena por total y desempata por dieces. En
          oficiales muestra también la categoría. Una vez tienes puntos, la tirada
          queda registrada y ya no puedes desapuntarte.
        </p>
      </Tema>

      <Tema titulo="La libreta: modos de apunte">
        <p>Al rellenar tu hoja puedes usar distintos modos (por defecto, el de tu perfil):</p>
        <ul>
          <li><strong>Tiro a tiro</strong>: escribes cada disparo (la <strong>X</strong> es un diez interior).</li>
          <li><strong>De 5 en 5 / de 10 en 10 / por serie</strong>: escribes solo el total de cada bloque.</li>
          <li>
            <strong>Asistido competición</strong>: por serie indicas cuántos 10, 9,
            8… hay <em>en total en la diana</em>; el botón <strong>«Blanco nuevo»</strong>{" "}
            marca cuándo empiezas diana nueva y el sistema descuenta lo de las
            series anteriores del mismo blanco.
          </li>
        </ul>
        <p>
          Se <strong>guarda solo</strong> mientras escribes. Al acabar,{" "}
          <strong>Finalizar hoja</strong> (puedes reabrirla para corregir).
        </p>
      </Tema>

      <Tema titulo="Puntuación final del árbitro (oficiales)">
        <p>
          En tiradas oficiales y semioficiales, al pie de la libreta puedes meter la{" "}
          <strong>puntuación final</strong> que dio el árbitro; el sistema guarda la
          diferencia respecto a tu conteo y esa es la que cuenta en el ranking.
        </p>
      </Tema>

      <Tema titulo="Mis tiradas">
        <p>
          En <strong>Mis tiradas</strong> tienes tu histórico y tus{" "}
          <strong>mejores marcas</strong> por modalidad.
        </p>
      </Tema>

      <Tema titulo="Comidas, campos y restaurantes">
        <ul>
          <li>
            <strong>Comidas</strong>: eventos con fecha, hora y restaurante. Te
            apuntas indicando <strong>acompañantes</strong> (+N).
          </li>
          <li>
            <strong>Campos</strong> y <strong>Restaurantes</strong>: catálogos con{" "}
            <strong>enlace de Google Maps</strong>. Cualquiera puede añadir uno.
          </li>
        </ul>
      </Tema>

      {/* ---------------------- NIVEL AVANZADO ---------------------- */}
      <SeccionTitulo>3 · Cronómetros y entrenamiento modular</SeccionTitulo>

      <Tema titulo="Los cronómetros de la libreta">
        <p>Cada serie tiene <strong>dos relojes</strong>:</p>
        <ul>
          <li>
            <strong>Carguen</strong>: cuenta de 1:00 y, al terminar, arranca solo el
            reloj de la serie.
          </li>
          <li>
            <strong>Serie</strong>: empieza con <strong>7&quot; de atención</strong> y
            sigue con el tiempo propio (p. ej. 150&quot; en precisión, 20&quot;/10&quot; en
            velocidad de Standard).
          </li>
        </ul>
        <p>
          Si pulsas la serie directamente, arranca en los 7&quot;. En entrenamientos
          suenan pitidos en cada cambio; en oficiales, no.
        </p>
      </Tema>

      <Tema titulo="Entrenamiento modular">
        <p>
          Es una modalidad especial (solo tipo entrenamiento). La libreta{" "}
          <strong>empieza vacía</strong> y tú vas construyendo la sesión:
        </p>
        <ul>
          <li>
            <strong>+ Añadir serie</strong>: elige el tipo (Precisión 150&quot;,
            Velocidad 20&quot;/10&quot;, Duelo 7/3). Cada serie trae su cronómetro y sus
            casillas de tiro.
          </li>
          <li>
            <strong>+ Añadir ejercicio</strong>: mete un ejercicio de la biblioteca
            y califícalo con una <strong>carita</strong> 🙂/😐/☹️ (verde/amarillo/
            rojo). Queda registrado para el análisis.
          </li>
        </ul>
        <p>
          Eliges el <strong>modo de libreta</strong> (tiro a tiro, total o asistido)
          al apuntarte, igual que en competición. Los ejercicios no puntúan; solo
          suman las series de disparos.
        </p>
      </Tema>

      <Tema titulo="Biblioteca de ejercicios y principios">
        <p>
          En <strong>Ejercicios</strong> tienes un catálogo con ficha completa
          (objetivo, material, ejecución, frecuencias, errores, progresión, métrica
          y claves), con <strong>buscador y filtro por tipología</strong>. Arriba,
          los <strong>principios de entrenamiento</strong> en un carrusel.
        </p>
      </Tema>

      <Tema titulo="Instalar la app (PWA)">
        <p>
          Al entrar suele aparecer un aviso para <strong>instalarla</strong>. En
          Android pulsa «Instalar app»; en iPhone, usa <strong>Compartir → Añadir a
          pantalla de inicio</strong>. Así se abre a pantalla completa como una app.
        </p>
      </Tema>

      <Tema titulo="Funciones del encargado">
        <p>Si eres encargado, además tienes:</p>
        <ul>
          <li><strong>Miembros</strong>: invitar por email, editar perfiles, marcar encargados y reenviar invitaciones.</li>
          <li><strong>Cerrar hojas</strong> de otros que se hayan quedado sin finalizar, en la tirada.</li>
          <li><strong>Copiar tiradores</strong>: exporta la relación (nº, nombre, DNI, licencia, categoría) al portapapeles.</li>
          <li>Gestionar la <strong>biblioteca de ejercicios</strong> (crear/editar/borrar).</li>
        </ul>
      </Tema>
    </div>
  );
}
