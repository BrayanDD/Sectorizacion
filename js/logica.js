(function () {
    
    // ==========================================
    // 1. CONSTANTES Y CONFIGURACIÓN ORIGINAL
    // ==========================================
    const franjas = [
        { id: "manana", label: "7:00–9:00 a. m.", start: 7*60, end: 9*60 },
        { id: "tarde", label: "2:00–4:00 p. m.", start: 14*60, end: 16*60 },
        { id: "noche", label: "8:00–9:00 p. m.", start: 20*60, end: 21*60 },
    ];
    
    const ROTACIONES = [
        { 
            manana: "Sector 1 y 4",
            tarde: "Sector 2",
            noche: "Sector 3"
        },
        { 
            manana: "Sector 3",
            tarde: "Sector 1 y 4",
            noche: "Sector 2"
        },
        { 
            manana: "Sector 2",
            tarde: "Sector 3",
            noche: "Sector 1 y 4"
        }
    ];
    
    const SECTOR_FINDE = { 
        manana: "Todos (Abierto)", 
        tarde: "Todos (Abierto)", 
        noche: "Todos (Abierto)" 
    };

    // ==========================================
    // 2. CONSTANTES DE EMERGENCIA (NUEVO)
    // ==========================================
    // Mapa de razones de emergencia a rutas de imagen
    const MAPA_IMAGENES = {
        "Falla eléctrica.": "img/emer/ener.png",
        "Incremento crítico del río.": "img/emer/agua.png",
        "Reparaciones urgentes de tubería.": "" // No necesita imagen
    };
    
    // ==========================================
    // 3. FUNCIONES DE CÁLCULO DE HORARIO (ORIGINALES)
    // ==========================================
    
    function getSectoresParaFecha(anio, mes, fecha) {
        
        const diaDeLaSemana = new Date(anio, mes, fecha).getDay();
        
        if (diaDeLaSemana === 0 || diaDeLaSemana === 6) {
            return SECTOR_FINDE;
        }
        
        let diasHabilesContados = 0;
        
        for (let i = 1; i <= fecha; i++) {
            const diaChequeado = new Date(anio, mes, i).getDay();
            
            if (diaChequeado > 0 && diaChequeado < 6) {
                diasHabilesContados++;
            }
        }
        
        if (diasHabilesContados === 0) {
            return SECTOR_FINDE; 
        }

        const indiceRotacion = (diasHabilesContados - 1) % 3;
        
        return ROTACIONES[indiceRotacion];
    }

    function ahoraBogota() {
        const now = new Date(); 
        const parts = new Intl.DateTimeFormat('es-CO', {
            timeZone: 'America/Bogota',
            hour12: false,
            weekday: 'short',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        }).formatToParts(now);

        const obj = Object.fromEntries(parts.map(p => [p.type, p.value]));
        const h = parseInt(obj.hour, 10);
        const m = parseInt(obj.minute, 10);
        const s = parseInt(obj.second, 10);
        
        const fecha = parseInt(obj.day, 10);
        const mes = parseInt(obj.month, 10) - 1; 
        const anio = parseInt(obj.year, 10);

        const weekdayShort = obj.weekday.toLowerCase();
        const mapDia = { "dom":0, "lun":1, "mar":2, "mié":3, "mie":3, "jue":4, "vie":5, "sáb":6, "sab":6 };
        const dia = mapDia[weekdayShort] ?? now.getDay(); 
        
        return { 
            horas: h, 
            minutos: m, 
            segundos: s, 
            minutosDesdeMedianoche: h*60+m, 
            dia: dia, 
            fecha: fecha, 
            mes: mes, 
            anio: anio 
        };
    }

    function franjaActual(mins) {
        return franjas.find(f => mins >= f.start && mins < f.end) || null;
    }

    function proximaFranja(mins) {
        const hoy = franjas.find(f => mins < f.start);
        if (hoy) return { ...hoy, cuando: "hoy" };
        return { ...franjas[0], cuando: "mañana" };
    }

    
    // ==========================================
    // 4. FUNCIÓN RENDER PRINCIPAL (MODIFICADA)
    // ==========================================
    function render() {
        // Los dos banners (normal y emergencia) deben existir en el HTML
        const bannerNormal = document.getElementById('bombeo-banner-normal');
        const bannerEmergencia = document.getElementById('bombeo-banner-emergencia');
        
        if (!bannerNormal || !bannerEmergencia) return;

        // --- 4.1. CHEQUEO DE ESTADO DE EMERGENCIA ---
        const estadoEmergencia = JSON.parse(localStorage.getItem('Emergencia') || '{}');
        
        if (estadoEmergencia.activo) {
            // ANULACIÓN: Muestra el banner de emergencia y sale
            
            bannerNormal.style.display = 'none'; // Oculta el normal
            bannerEmergencia.style.display = 'flex'; // Muestra el de emergencia
            bannerEmergencia.className = "bombeo-banner inactive"; // Estilo rojo
            bannerEmergencia.innerHTML = ""; // Limpia el contenido anterior

            // Crea el contenido de la emergencia
            const dot = document.createElement('span');
            dot.className = 'dot';
            const texto = document.createElement('div');
            
            // Construye el mensaje
            let mensajeCompleto = estadoEmergencia.razon;
            if (estadoEmergencia.descripcion_custom) {
                mensajeCompleto += `: ${estadoEmergencia.descripcion_custom}`;
            }

            texto.textContent = `¡ATENCIÓN! Distribución suspendida por ${mensajeCompleto}`;
            
            // Añadir la imagen si la URL está presente
            if (estadoEmergencia.imagenURL) {
                const imagen = document.createElement('img');
                imagen.src = estadoEmergencia.imagenURL;
                imagen.style.height = '40px'; 
                imagen.style.marginRight = '15px';
                imagen.style.borderRadius = '4px';
                imagen.alt = 'Motivo de suspensión';
                
                bannerEmergencia.appendChild(imagen); 
            }
            
            bannerEmergencia.appendChild(dot);
            bannerEmergencia.appendChild(texto);
            
            return; // Detiene la ejecución del cálculo normal
        }
        
        // --- 4.2. CÁLCULO DE HORARIO NORMAL ---
        
        // Vuelve al estado normal
        bannerEmergencia.style.display = 'none';
        bannerNormal.style.display = 'flex';
        bannerNormal.innerHTML = ""; // Limpia el banner normal para rellenar

        const { minutosDesdeMedianoche, dia, fecha, mes, anio } = ahoraBogota();
        
        const sectoresDelDia = getSectoresParaFecha(anio, mes, fecha);
        
        const actual = franjaActual(minutosDesdeMedianoche);
        
        const dot = document.createElement('span');
        dot.className = 'dot';
        const texto = document.createElement('div');

        if (actual) {
            // Estado: ACTIVO
            const sector = sectoresDelDia[actual.id];
            bannerNormal.className = "bombeo-banner active";
            texto.textContent = `Se inició el bombeo — ${actual.label}. Sector: ${sector}.`;
        } else {
            // Estado: INACTIVO
            const prox = proximaFranja(minutosDesdeMedianoche);
            
            let sectorProx;
            if (prox.cuando === "hoy") {
                sectorProx = sectoresDelDia[prox.id];
            } else {
                // Si es mañana, recalculamos los sectores para el día siguiente
                const fechaHoy = new Date(anio, mes, fecha);
                const fechaManana = new Date(fechaHoy.getTime() + (24 * 60 * 60 * 1000));
                
                const sectoresManana = getSectoresParaFecha(
                    fechaManana.getFullYear(), 
                    fechaManana.getMonth(), 
                    fechaManana.getDate()
                );
                sectorProx = sectoresManana[prox.id];
            }
            
            bannerNormal.className = "bombeo-banner inactive";
            texto.textContent = `No hay bombeo en este momento. Próxima franja ${prox.cuando}: ${prox.label} (Sector: ${sectorProx}).`;
        }

        bannerNormal.appendChild(dot);
        bannerNormal.appendChild(texto);
    }


    // ==========================================
    // 5. LÓGICA DEL PANEL DE ADMINISTRACIÓN (NUEVO)
    // ==========================================
    
    function inicializarPanelAdmin() {
        const btnActivar = document.getElementById('activar-emergencia');
        const btnDesactivar = document.getElementById('desactivar-emergencia');
        const selectRazon = document.getElementById('razon-emergencia');
        const textareaCustom = document.getElementById('descripcion-custom');
        const spanEstado = document.getElementById('estado-actual');
    
        function actualizarPanel() {
            const estado = JSON.parse(localStorage.getItem('Emergencia') || '{}');
            if (estado.activo) {
                spanEstado.textContent = `EMERGENCIA ACTIVA: ${estado.razon} ${estado.descripcion_custom ? '(' + estado.descripcion_custom + ')' : ''}`;
                spanEstado.style.color = 'red';
            } else {
                spanEstado.textContent = 'Normal';
                spanEstado.style.color = 'green';
            }
        }
        
        // Listener para ACTIVAR SUSPENSIÓN
        btnActivar.addEventListener('click', () => {
            const razonSeleccionada = selectRazon.value; 
            const descripcionCustom = textareaCustom.value.trim();
    
            if (razonSeleccionada === "" && descripcionCustom === "") {
                alert("Debe seleccionar una razón predeterminada o escribir una descripción personalizada.");
                return;
            }
    
            const imagenURL = MAPA_IMAGENES[razonSeleccionada] || '';
    
            localStorage.setItem('Emergencia', JSON.stringify({
                activo: true,
                razon: razonSeleccionada,
                descripcion_custom: descripcionCustom,
                imagenURL: imagenURL
            }));
            
            render(); 
            actualizarPanel();
        });
    
        // Listener para DESACTIVAR SUSPENSIÓN (Reinicio manual)
        btnDesactivar.addEventListener('click', () => {
            localStorage.removeItem('Emergencia');
            render(); 
            actualizarPanel();
            selectRazon.value = ""; 
            textareaCustom.value = "";
        });
        
        actualizarPanel();
    }


    // ==========================================
    // 6. INICIALIZACIÓN GLOBAL (MODIFICADA)
    // ==========================================
    
    // Lógica de detección de admin usando un parámetro en la URL, ej: ?admin=2020
    const urlParams = new URLSearchParams(window.location.search);
    const claveAdmin = urlParams.get('admin'); 
    
    if (claveAdmin === '2020') { 
        const adminPanel = document.getElementById('admin-panel');
        if (adminPanel) {
            adminPanel.style.display = 'block';
            inicializarPanelAdmin();
        }
    }

    // Ejecuta la función de renderizado por primera vez y la repite cada minuto.
    render();
    setInterval(render, 60 * 1000);
    
})();