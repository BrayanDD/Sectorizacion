import { initializeApp } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-analytics.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, limit, deleteDoc, doc, getDocs } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyAq2xyvr061fsby73zejZacakTD6lwCu5I",
    authDomain: "sectorizacion-5a0c7.firebaseapp.com",
    projectId: "sectorizacion-5a0c7",
    storageBucket: "sectorizacion-5a0c7.firebasestorage.app",
    messagingSenderId: "422430272645",
    appId: "1:422430272645:web:d1a1aff2e0f039167f8dec",
    measurementId: "G-LZKGQ01JPB"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app); 
const db = getFirestore(app); 

// --- CONFIGURACIÓN DE RUTAS Y CONSTANTES ---

const MENSAJES_COLLECTION_PATH = 'mensajes'; 
const FRANCAS = [
    { id: "manana", label: "7:00–9:00 a. m.", start: 7 * 60, end: 9 * 60 },
    { id: "tarde", label: "2:00–4:00 p. m.", start: 14 * 60, end: 16 * 60 },
    { id: "noche", label: "8:00–9:00 p. m.", start: 20 * 60, end: 21 * 60 },
];
const ROTACIONES = [
    { manana: "Sector 1 y 4", tarde: "Sector 2", noche: "Sector 3" },
    { manana: "Sector 3", tarde: "Sector 1 y 4", noche: "Sector 2" },
    { manana: "Sector 2", tarde: "Sector 3", noche: "Sector 1 y 4" }
];
const SECTOR_FINDE = { manana: "Todos (Abierto)", tarde: "Todos (Abierto)", noche: "Todos (Abierto)" };

// --- FUNCIONES DE UTILIDAD Y HORARIOS ---

function showMessage(message, divId, type = 'danger') {
    const messageDiv = document.getElementById(divId);
    if (!messageDiv) return;
    messageDiv.className = `singmessage alert alert-${type}`;
    messageDiv.style.display = "block";
    messageDiv.innerHTML = message;

    setTimeout(function () {
        messageDiv.style.display = "none";
    }, 5000);
}

function getSectoresParaFecha(anio, mes, fecha) {
    const diaDeLaSemana = new Date(anio, mes, fecha).getDay();
    if (diaDeLaSemana === 0 || diaDeLaSemana === 6) { return SECTOR_FINDE; }

    let diasHabilesContados = 0;
    for (let i = 1; i <= fecha; i++) {
        const diaChequeado = new Date(anio, mes, i).getDay();
        if (diaChequeado > 0 && diaChequeado < 6) {
            diasHabilesContados++;
        }
    }
    if (diasHabilesContados === 0) { return SECTOR_FINDE; }
    const indiceRotacion = (diasHabilesContados - 1) % 3;
    return ROTACIONES[indiceRotacion];
}

function ahoraBogota() {
    const now = new Date();
    const parts = new Intl.DateTimeFormat('es-CO', { timeZone: 'America/Bogota', hour12: false, weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }).formatToParts(now);
    const obj = Object.fromEntries(parts.map(p => [p.type, p.value]));
    const h = parseInt(obj.hour, 10);
    const m = parseInt(obj.minute, 10);
    const fecha = parseInt(obj.day, 10);
    const mes = parseInt(obj.month, 10) - 1;
    const anio = parseInt(obj.year, 10);
    const weekdayShort = obj.weekday.toLowerCase();
    const mapDia = { "dom": 0, "lun": 1, "mar": 2, "mié": 3, "mie": 3, "jue": 4, "vie": 5, "sáb": 6, "sab": 6 };
    const dia = mapDia[weekdayShort] ?? now.getDay();
    return { horas: h, minutos: m, minutosDesdeMedianoche: h * 60 + m, dia: dia, fecha: fecha, mes: mes, anio: anio };
}

function franjaActual(mins) {
    return FRANCAS.find(f => mins >= f.start && mins < f.end) || null;
}

function proximaFranja(mins) {
    const hoy = FRANCAS.find(f => mins < f.start);
    if (hoy) return { ...hoy, cuando: "hoy" };
    return { ...FRANCAS[0], cuando: "mañana" };
}

/**
 * Función principal de renderizado del banner de horarios.
 * NOTA IMPORTANTE: Esta función ahora contiene una protección para NO actualizar
 * el banner de horario si el banner de emergencia está activo.
 */
function render() {
    const banner = document.getElementById('bombeo-banner');
    const bannerEmergencia = document.getElementById('emergency-message-banner');
    
    // Si el banner de emergencia NO está oculto, ocultamos el de bombeo y salimos.
    if (!banner || (bannerEmergencia && !bannerEmergencia.classList.contains('d-none'))) {
        banner?.classList.add('d-none'); // Usamos optional chaining por si banner es null
        return;
    }

    // Si llegamos aquí, NO hay mensaje de emergencia, por lo que mostramos el banner de bombeo.
    banner.classList.remove('d-none');
    banner.innerHTML = "";

    const { minutosDesdeMedianoche, fecha, mes, anio } = ahoraBogota();
    const sectoresDelDia = getSectoresParaFecha(anio, mes, fecha);
    const actual = franjaActual(minutosDesdeMedianoche);

    const dot = document.createElement('span');
    dot.className = 'dot';
    const texto = document.createElement('div');

    if (actual) {
        const sector = sectoresDelDia[actual.id];
        banner.className = "bombeo-banner active";
        texto.textContent = `💧 Bombeo ACTIVO — ${actual.label}. Sector: ${sector}.`;
    } else {
        const prox = proximaFranja(minutosDesdeMedianoche);
        let sectorProx;
        if (prox.cuando === "hoy") {
            sectorProx = sectoresDelDia[prox.id];
        } else {
            const fechaHoy = new Date(anio, mes, fecha);
            const fechaManana = new Date(fechaHoy.getTime() + (24 * 60 * 60 * 1000));
            const sectoresManana = getSectoresParaFecha(fechaManana.getFullYear(), fechaManana.getMonth(), fechaManana.getDate());
            sectorProx = sectoresManana[prox.id];
        }
        banner.className = "bombeo-banner inactive";
        texto.textContent = `🔴 Bombeo Inactivo. Próxima franja ${prox.cuando}: ${prox.label} (Sector: ${sectorProx}).`;
    }

    banner.appendChild(dot);
    banner.appendChild(texto);
}

// --- FUNCIONES DE EMERGENCIA (CON LA CORRECCIÓN DE REFERENCIA) ---

/**
 * Función CLAVE que se suscribe a los cambios del mensaje de emergencia en Firestore.
 */
function iniciarEscuchaMensajeEmergencia() {
    // CORRECCIÓN: Se asegura que se obtengan los elementos del DOM antes de usarlos
    const bannerEmergencia = document.getElementById('emergency-message-banner');
    const bannerHorario = document.getElementById('bombeo-banner');
    const emergencyMessageTextarea = document.getElementById('emergency-message-text');
    
    // Comprobación de existencia para evitar ReferenceError si el DOM no carga o hay un error en el ID.
    if (!bannerEmergencia || !bannerHorario || !emergencyMessageTextarea) {
        console.warn("Elementos de emergencia/bombeo no encontrados en el DOM. Listener de emergencia no configurado.");
        return;
    }

    // Consultar el último mensaje, ordenado por timestamp
    const q = query(collection(db, MENSAJES_COLLECTION_PATH), orderBy('timestamp', 'desc'), limit(1));

    // onSnapshot escucha en tiempo real
    onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
            const doc = snapshot.docs[0];
            const mensaje = doc.data().mensaje;
            
            // Lógica Pública (Banner)
            bannerEmergencia.textContent = `🚨 EMERGENCIA: ${mensaje}`;
            bannerEmergencia.classList.remove('d-none'); // MOSTRAR EMERGENCIA
            bannerEmergencia.classList.add('active');
            bannerHorario.classList.add('d-none'); // OCULTAR HORARIO NORMAL
            
            // Lógica Admin (Cuadro de texto)
            emergencyMessageTextarea.value = mensaje; // CARGAR MENSAJE EN TEXTAREA

        } else {
            // Lógica Pública (Banner)
            bannerEmergencia.classList.add('d-none'); // OCULTAR EMERGENCIA
            bannerEmergencia.classList.remove('active');
            bannerHorario.classList.remove('d-none'); // MOSTRAR HORARIO NORMAL
            
            // Lógica Admin (Cuadro de texto)
            emergencyMessageTextarea.value = ''; // LIMPIAR TEXTAREA
        }
        // Llama a render para asegurar que el banner de horario se actualice o se oculte correctamente.
        render();
    }, (error) => {
        console.error("Error en onSnapshot de emergencia:", error);
        showMessage("Error al leer mensajes de emergencia de la DB: " + error.message, 'singme', 'danger');
    });
}

/**
 * Función auxiliar para asegurar que solo exista un mensaje.
 */
async function limpiarColeccionMensajes() {
    try {
        const q = query(collection(db, MENSAJES_COLLECTION_PATH), orderBy('timestamp', 'desc'));
        const snapshot = await getDocs(q);
        const deletePromises = [];
        snapshot.docs.forEach(doc => {
            deletePromises.push(deleteDoc(doc.ref));
        });
        await Promise.all(deletePromises);
        console.log("Limpieza de mensajes antiguos exitosa.");
    } catch (error) {
        console.error("Error al intentar limpiar mensajes antiguos:", error);
        throw new Error("Fallo en la limpieza de mensajes. Detalle: " + error.message);
    }
}

/**
 * Envía o actualiza el mensaje de emergencia.
 */
async function enviarMensajeEmergencia(mensaje) {
    if (!mensaje.trim()) {
        showMessage("El mensaje no puede estar vacío.", 'singme', 'warning');
        return;
    }
    try {
        // 1. Limpia la colección.
        await limpiarColeccionMensajes(); 
        
        // 2. Agrega el nuevo mensaje con su timestamp
        await addDoc(collection(db, MENSAJES_COLLECTION_PATH), {
            mensaje: mensaje,
            timestamp: new Date().toISOString()
        });
        showMessage("Mensaje de emergencia publicado correctamente.", 'singme', 'success');
        
    } catch (error) {
        console.error("Error crítico al enviar mensaje:", error);
        showMessage("Error al enviar mensaje. Revisa la consola (F12) para el detalle. " + error.message, 'singme', 'danger');
    }
}

/**
 * Elimina el último mensaje de emergencia.
 */
async function limpiarMensajeEmergencia() {
    try {
        const q = query(collection(db, MENSAJES_COLLECTION_PATH), orderBy('timestamp', 'desc'), limit(1));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
            const docId = snapshot.docs[0].id;
            await deleteDoc(doc(db, MENSAJES_COLLECTION_PATH, docId));
            showMessage("Mensaje de emergencia limpiado/ocultado.", 'singme', 'info');
        } else {
            showMessage("No hay mensajes activos para limpiar.", 'singme', 'info');
        }
    } catch (error) {
        console.error("Error al limpiar mensaje:", error);
        showMessage("Error al limpiar mensaje: " + error.message, 'singme', 'danger');
    }
}

// --- GESTIÓN DE AUTENTICACIÓN Y UI (CLAVE) ---

function setupAuthListener() {
    const showLoginBtn = document.getElementById('show-login-btn');
    const loginForm = document.getElementById('login-form');
    const containerShowBtn = document.getElementById('contenedor-boton-mostrar');
    const adminMessageContainer = document.getElementById('admin-message-container');
    const logoutBtn = document.getElementById('logout-btn');
    const subloginBtn = document.getElementById('sublogin');


    // Esta es la función CLAVE: detecta el estado de login
    onAuthStateChanged(auth, (user) => {
        if (user) {
            // Usuario logueado (Administrador)
            containerShowBtn?.classList.add('d-none');
            loginForm?.classList.add('d-none');
            adminMessageContainer?.classList.remove('d-none'); // Muestra el cuadro de texto
            logoutBtn?.classList.remove('d-none');
        } else {
            // Usuario no logueado (Público)
            adminMessageContainer?.classList.add('d-none');
            logoutBtn?.classList.add('d-none');
            containerShowBtn?.classList.remove('d-none');
        }
    });

    logoutBtn?.addEventListener('click', async () => {
        try {
            await signOut(auth);
            showMessage("Sesión cerrada correctamente.", 'singme', 'info');
        } catch (error) {
            console.error("Error al cerrar sesión:", error);
        }
    });
}

// --- INICIALIZACIÓN DE LA APLICACIÓN (Se ejecuta al cargar el DOM) ---

document.addEventListener("DOMContentLoaded", () => {
    // 1. Iniciar la renderización de horarios
    render();
    setInterval(render, 60 * 1000);

    const showLoginBtn = document.getElementById('show-login-btn');
    const subloginBtn = document.getElementById('sublogin');
    const sendEmergencyBtn = document.getElementById('send-emergency-btn');
    const clearEmergencyBtn = document.getElementById('clear-emergency-btn');
    const loginForm = document.getElementById('login-form');
    const containerShowBtn = document.getElementById('contenedor-boton-mostrar');

    // 2. Event Listeners del UI

    // Mostrar Formulario de Login
    showLoginBtn?.addEventListener('click', () => {
        containerShowBtn?.classList.add('d-none');
        loginForm?.classList.remove('d-none');
    });

    // Login (SignIn)
    subloginBtn?.addEventListener('click', async (event) => {
        event.preventDefault();

        const email = document.getElementById("email").value; 
        const password = document.getElementById("password").value;

        if (subloginBtn) {
            subloginBtn.disabled = true;
            subloginBtn.textContent = 'Cargando...';
        }

        try {
            await signInWithEmailAndPassword(auth, email, password);
            showMessage("Inicio de sesión exitoso. ¡Bienvenido!", "singme", 'success');
        } catch (error) {
            showMessage("Error al iniciar sesión: " + error.message, "singme", 'danger');
        } finally {
            if (subloginBtn) {
                subloginBtn.disabled = false;
                subloginBtn.textContent = 'Acceder';
            }
        }
    });

    // Enviar Mensaje de Emergencia
    sendEmergencyBtn?.addEventListener('click', () => {
        const mensaje = document.getElementById('emergency-message-text').value;
        enviarMensajeEmergencia(mensaje);
    });

    // Limpiar Mensaje de Emergencia
    clearEmergencyBtn?.addEventListener('click', () => {
        limpiarMensajeEmergencia();
    });

    // 3. Iniciar Listeners de Firebase
    setupAuthListener();
    // INICIAR ESCUCHA DE EMERGENCIA (ESTO CARGA EL MENSAJE AL INICIO)
    iniciarEscuchaMensajeEmergencia();
});