
(function () {
  
  const franjas = [
    { id: "manana", label: "7:00–9:00 a. m.", start: 7*60,  end: 9*60  },
    { id: "tarde",  label: "2:00–4:00 p. m.", start: 14*60, end: 16*60 },
    { id: "noche",  label: "8:00–9:00 p. m.", start: 20*60, end: 21*60 },
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
    const now = new Date(); // Fecha real
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

  
  function render() {
    const banner = document.getElementById('bombeo-banner');
    if (!banner) return;


    const { minutosDesdeMedianoche, dia, fecha, mes, anio } = ahoraBogota();
    

    const sectoresDelDia = getSectoresParaFecha(anio, mes, fecha);
    

    const actual = franjaActual(minutosDesdeMedianoche);
    banner.innerHTML = ""; 

    const dot = document.createElement('span');
    dot.className = 'dot';
    const texto = document.createElement('div');

    if (actual) {
   
      const sector = sectoresDelDia[actual.id];
      banner.className = "bombeo-banner active";
      texto.textContent = `Se inició el bombeo — ${actual.label}. Sector: ${sector}.`;
  } else {
      
      const prox = proximaFranja(minutosDesdeMedianoche);
      
      let sectorProx;
      if (prox.cuando === "hoy") {
      
        sectorProx = sectoresDelDia[prox.id];
      } else {
        
        const fechaHoy = new Date(anio, mes, fecha);
        const fechaManana = new Date(fechaHoy.getTime() + (24 * 60 * 60 * 1000));
        
        const sectoresManana = getSectoresParaFecha(
          fechaManana.getFullYear(), 
          fechaManana.getMonth(), 
          fechaManana.getDate()
        );
        sectorProx = sectoresManana[prox.id];
      }
      
      banner.className = "bombeo-banner inactive";
      texto.textContent = `No hay bombeo en este momento. Próxima franja ${prox.cuando}: ${prox.label} (Sector: ${sectorProx}).`;
    }

    banner.appendChild(dot);
    banner.appendChild(texto);
  }

  render();
  setInterval(render, 60 * 1000);
})();
