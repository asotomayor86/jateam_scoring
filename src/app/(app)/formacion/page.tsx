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
          Comidas, Restaurantes, Chat, Perfil (y Miembros, solo para el encargado).
        </p>
        <p>
          Algunas secciones muestran un <strong>círculo con un número</strong>{" "}
          cuando hay novedades: <strong>rojo</strong> en Chat (mensajes nuevos) y{" "}
          <strong>verde</strong> en Tiradas (tiradas/entrenos nuevos). Se pone a
          cero al abrir la sección.
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
          <strong>amistosa</strong> (ámbar), <strong>entrenamiento</strong>{" "}
          (verde) y <strong>comida</strong> (azul). «Pasado» se calcula por la
          hora de inicio real.
        </p>
      </Tema>

      {/* ---------------------- NIVEL INTERMEDIO ---------------------- */}
      <SeccionTitulo>2 · Tiradas, libreta y eventos</SeccionTitulo>

      <Tema titulo="Tipos de tirada">
        <ul>
          <li><strong>Entrenamiento</strong>: práctica personal o de grupo.</li>
          <li><strong>Amistosa</strong>: tirada «seria» entre nosotros.</li>
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
          En el detalle de la tirada pulsa <strong>Apuntarme</strong>. En las
          oficiales eliges tu <strong>categoría</strong> (1ª/2ª/3ª/Veterano/Damas).
          El <strong>modo de apunte</strong> se elige y se cambia luego{" "}
          <strong>dentro de la libreta</strong> (ver «La libreta»).
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
          El modo se puede <strong>cambiar dentro de la libreta</strong> mientras
          no tengas ningún apunte de disparo: arriba aparece un selector{" "}
          <strong>«Modo de apunte»</strong>. Además, cada serie tiene un{" "}
          <strong>icono de diana</strong> 🎯 para apuntarla de forma{" "}
          <strong>gráfica</strong> (ver «Apuntar en la diana»).
        </p>
        <p>
          Se <strong>guarda solo</strong> mientras escribes. Al acabar,{" "}
          <strong>Finalizar hoja</strong> (puedes reabrirla para corregir).
        </p>
      </Tema>

      <Tema titulo="Puntuación final del árbitro (oficiales)">
        <p>
          En tiradas oficiales y amistosas, al pie de la libreta puedes meter la{" "}
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
            <strong>enlace de Google Maps</strong>. Los ve todo el mundo, pero{" "}
            <strong>solo el encargado</strong> puede añadirlos o editarlos.
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
          suenan avisos en cada cambio; en oficiales, no.
        </p>
        <p>
          Cada aviso tiene un <strong>sonido distinto</strong> para reconocerlo de
          oído sin mirar la pantalla:
        </p>
        <ul>
          <li>
            <strong>Carguen</strong>: dos tonos graves con la cadencia
            &quot;caaar-guen&quot;.
          </li>
          <li>
            <strong>Atención</strong>: tres tonos con la cadencia
            &quot;aaa-ten-ción&quot; (sube al final).
          </li>
          <li>
            <strong>Empiezan los disparos</strong>: un pitido <strong>agudo</strong>.
          </li>
          <li>
            <strong>Alto / fin</strong>: un tono <strong>grave</strong> y largo.
          </li>
        </ul>
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
          El <strong>modo de libreta</strong> (tiro a tiro, total o asistido) se
          elige y se cambia <strong>dentro de la libreta</strong> mientras esté
          vacía. Cada <strong>módulo de disparo</strong> tiene también su{" "}
          <strong>icono de diana</strong> 🎯. Los ejercicios no puntúan; solo suman
          las series de disparos.
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
          <li>Gestionar los catálogos: <strong>campos</strong>, <strong>restaurantes</strong>, <strong>modalidades</strong> y la <strong>biblioteca de ejercicios</strong> (crear/editar/borrar).</li>
          <li><strong>Chat</strong>: borrar <strong>hilos</strong> (solo el encargado) y borrar <strong>cualquier mensaje</strong>.</li>
        </ul>
      </Tema>

      {/* ---------------------- NOVEDADES ---------------------- */}
      <SeccionTitulo>4 · Diana y láser</SeccionTitulo>

      <Tema titulo="Apuntar en la diana (modo gráfico)" abierto>
        <p>
          En <strong>tiro a tiro</strong>, <strong>asistido</strong> y en las series
          del <strong>modular</strong>, cada tarjeta tiene un{" "}
          <strong>icono de diana</strong> 🎯. Al pulsarlo, las casillas de puntos se
          cambian por una <strong>diana a escala</strong> donde marcas <em>con el
          dedo</em> dónde cae cada disparo.
        </p>
        <ul>
          <li>
            <strong>Mantén pulsado</strong> para añadir un impacto; luego{" "}
            <strong>arrastra en cualquier punto</strong> de la diana para moverlo
            (así el dedo no lo tapa).
          </li>
          <li>
            La <strong>puntuación sale sola</strong> del anillo donde cae: en cuanto
            el borde del punto <strong>toca la línea</strong>, ya vale ese anillo.
          </li>
          <li>
            Ves la <strong>agrupación</strong> (círculo azul con su centro), la
            dispersión y cuánto se desvía del centro.
          </li>
          <li>Toca un impacto para <strong>seleccionarlo</strong> y poder borrarlo.</li>
          <li>
            Debajo de la diana están los <strong>cajetines de los disparos</strong>,
            que se van rellenando con la puntuación de cada uno.
          </li>
        </ul>
        <p>
          En <strong>asistido</strong>, si la serie no es «blanco nuevo», los
          impactos de las series anteriores del mismo blanco aparecen en{" "}
          <strong>gris</strong> (solo referencia) y tú añades los nuevos en rojo.
        </p>
        <p>
          Queda registrada la <strong>posición y la puntuación</strong> de cada
          disparo para analizar dónde agrupas.
        </p>
      </Tema>

      <Tema titulo="Apuntar en la diana (modo láser)">
        <p>
          En esas mismas tarjetas, junto al icono de la diana, hay un{" "}
          <strong>icono de cámara</strong> 📷 (con una diana detrás y la lente roja).
          Es una herramienta para entrenar en casa: apuntas el móvil a una{" "}
          <strong>diana reducida</strong> impresa y disparas con un{" "}
          <strong>láser de entrenamiento</strong>; el sistema detecta dónde da cada
          disparo y lo apunta en la serie. De momento es una{" "}
          <strong>prueba (beta)</strong>.
        </p>
        <p>Al pulsar la cámara se abre dentro de la propia tarjeta. Pasos:</p>
        <ul>
          <li>
            <strong>Iniciar cámara</strong> y da permiso (mejor en penumbra, con el
            móvil fijo en un soporte de frente a la diana).
          </li>
          <li>
            Marca las <strong>4 esquinas de la tarjeta</strong> (mantén pulsado para
            crear cada punto, arrastra para afinar). Con <strong>dos dedos</strong>{" "}
            puedes hacer <strong>zoom</strong>.
          </li>
          <li>
            Pulsa <strong>«Detectar diana»</strong>: ajusta la diana dentro de esa
            zona (corrige el centro y la inclinación).
          </li>
          <li>
            Pulsa <strong>«Escuchar disparos»</strong> y dispara: cada punto láser se
            marca en la diana y en los cajetines de la serie.
          </li>
          <li>
            <strong>«Ocultar cámara»</strong> cierra el visor para dejar más sitio; el
            icono de la cámara vuelve a abrirlo.
          </li>
        </ul>
        <p>
          Requiere una diana reducida a escala (p. ej. la de 25 m al 28 % se dispara
          a unos 7 m) y buena luz. El <strong>zoom</strong> depende del móvil (en
          Android suele ir; en iPhone puede no estar disponible).
        </p>
      </Tema>

      <Tema titulo="Cambiar el modo de apunte">
        <p>
          Ya no se elige al apuntarte. <strong>Dentro de la libreta</strong>,
          mientras no tengas ningún apunte de disparo, aparece arriba un selector{" "}
          <strong>«Modo de apunte»</strong> para cambiar entre tiro a tiro, bloques,
          por serie o asistido. En cuanto apuntas la primera serie, desaparece (para
          no reinterpretar lo ya metido).
        </p>
      </Tema>

      <SeccionTitulo>5 · Chat y notificaciones</SeccionTitulo>

      <Tema titulo="Chat del grupo">
        <p>
          En <strong>Chat</strong> el grupo habla por <strong>hilos</strong>:
          alguien abre un hilo (título y primer mensaje opcional) y dentro os vais
          respondiendo.
        </p>
        <ul>
          <li>
            <strong>↻ Actualizar</strong> y auto-refresco cada pocos segundos; el
            arrastrar-para-refrescar del móvil también funciona.
          </li>
          <li>Los <strong>enlaces</strong> (http) se hacen clicables solos.</li>
          <li>
            Cada uno borra <strong>sus</strong> mensajes; el{" "}
            <strong>encargado</strong> borra cualquiera y es el único que puede
            borrar hilos.
          </li>
          <li>
            <strong>Retención</strong>: los mensajes de más de{" "}
            <strong>3 meses</strong> se borran automáticamente.
          </li>
        </ul>
      </Tema>

      <Tema titulo="Mencionar a alguien (@)">
        <p>
          Al escribir <strong>@</strong> en un mensaje del chat sale la lista de
          miembros; elige a quien quieras <strong>nombrar</strong>. Si esa persona
          tiene las notificaciones activadas, le llega un aviso al móvil.
        </p>
      </Tema>

      <Tema titulo="Notificaciones y avisos">
        <p>Hay dos niveles:</p>
        <ul>
          <li>
            <strong>En la app</strong>: los círculos del menú —{" "}
            <strong>rojo</strong> en Chat y <strong>verde</strong> en Tiradas — con
            el número de novedades desde tu última visita.
          </li>
          <li>
            <strong>Al móvil</strong>: aviso aunque tengas la app cerrada cuando te{" "}
            <strong>mencionan (@)</strong> o se crea una{" "}
            <strong>tirada/entreno</strong> nueva, con un círculo en el{" "}
            <strong>icono de la app</strong>.
          </li>
        </ul>
        <p>
          Para recibir los del móvil: <strong>instala la app</strong> en la pantalla
          de inicio (en <strong>iPhone es imprescindible</strong>, y ábrela desde ese
          icono) y en <strong>Perfil → Notificaciones</strong> pulsa{" "}
          <strong>«Activar notificaciones»</strong> y acepta el permiso. Se activa en
          cada dispositivo por separado.
        </p>
      </Tema>
    </div>
  );
}
