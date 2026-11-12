/* Cobertura panhispánica: detectar país solo cuando se menciona expresamente
 * o se nombra una ciudad sin ambigüedad. Nunca inferir el país del usuario.
 * GDELT y Google Search cubren países sin RSS propio disponible. */
export const SPANISH_NEWS_REGIONS=Object.freeze([
 {code:'AR',name:'Argentina',timeZone:'America/Argentina/Buenos_Aires',aliases:['argentina','buenos aires','cordoba argentina','rosario argentina','mendoza argentina']},
 {code:'BO',name:'Bolivia',timeZone:'America/La_Paz',aliases:['bolivia','la paz bolivia','santa cruz bolivia','cochabamba']},
 {code:'CL',name:'Chile',timeZone:'America/Santiago',aliases:['chile','santiago de chile','valparaiso','concepcion chile','antofagasta']},
 {code:'CO',name:'Colombia',timeZone:'America/Bogota',aliases:['colombia','bogota','medellin','barranquilla','cartagena de indias','cali colombia']},
 {code:'CR',name:'Costa Rica',timeZone:'America/Costa_Rica',aliases:['costa rica','san jose costa rica']},
 {code:'CU',name:'Cuba',timeZone:'America/Havana',aliases:['cuba','la habana','santiago de cuba']},
 {code:'DO',name:'República Dominicana',timeZone:'America/Santo_Domingo',aliases:['republica dominicana','dominicana','dominicanas','dominicanos','rd','santo domingo','higuey','higüey','punta cana','la altagracia','santiago de los caballeros','puerto plata','la romana','bavaro','san pedro de macoris']},
 {code:'EC',name:'Ecuador',timeZone:'America/Guayaquil',aliases:['ecuador','quito','guayaquil','cuenca ecuador']},
 {code:'SV',name:'El Salvador',timeZone:'America/El_Salvador',aliases:['el salvador','san salvador','santa ana el salvador']},
 {code:'GQ',name:'Guinea Ecuatorial',timeZone:'Africa/Malabo',aliases:['guinea ecuatorial','malabo','bata guinea ecuatorial']},
 {code:'GT',name:'Guatemala',timeZone:'America/Guatemala',aliases:['guatemala','ciudad de guatemala','quetzaltenango','xela']},
 {code:'HN',name:'Honduras',timeZone:'America/Tegucigalpa',aliases:['honduras','tegucigalpa','san pedro sula']},
 {code:'MX',name:'México',timeZone:'America/Mexico_City',aliases:['mexico','méxico','cdmx','ciudad de mexico','guadalajara mexico','monterrey','oaxaca','puebla mexico','cancun']},
 {code:'NI',name:'Nicaragua',timeZone:'America/Managua',aliases:['nicaragua','managua','leon nicaragua']},
 {code:'PA',name:'Panamá',timeZone:'America/Panama',aliases:['panama','panamá','ciudad de panama','colon panama']},
 {code:'PY',name:'Paraguay',timeZone:'America/Asuncion',aliases:['paraguay','asuncion','encarnacion paraguay']},
 {code:'PE',name:'Perú',timeZone:'America/Lima',aliases:['peru','perú','lima','arequipa','cusco','trujillo peru']},
 {code:'PR',name:'Puerto Rico',timeZone:'America/Puerto_Rico',aliases:['puerto rico','san juan puerto rico','ponce puerto rico']},
 {code:'ES',name:'España',timeZone:'Europe/Madrid',aliases:['espana','españa','madrid','barcelona','sevilla','valencia espana','bilbao','zaragoza']},
 {code:'UY',name:'Uruguay',timeZone:'America/Montevideo',aliases:['uruguay','montevideo','punta del este']},
 {code:'VE',name:'Venezuela',timeZone:'America/Caracas',aliases:['venezuela','caracas','maracaibo','valencia venezuela']}
]);
export const normalizePlace=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
export function regionForQuery(query){
 const text=' '+normalizePlace(query)+' ';
 // Place aliases are matched by complete words, never by substrings.
 const matches=SPANISH_NEWS_REGIONS.map(region=>{
  const aliases=region.aliases.map(normalizePlace).filter(alias=>text.includes(' '+alias+' '));
  return aliases.length?{region,score:Math.max(...aliases.map(a=>a.length))}:null;
 }).filter(Boolean).sort((a,b)=>b.score-a.score);
 // More than one explicitly named country -> international, with no single-country bias.
 if(!matches.length)return null;
 if(matches.length>1){
  const winner=matches[0].score;
  if(matches[1].score>=winner-5)return null;
 }
 return matches[0].region;
}
export const regionDate=(date,region)=>new Intl.DateTimeFormat('en-CA',{
 timeZone:region?.timeZone||'America/Santo_Domingo',year:'numeric',month:'2-digit',day:'2-digit'
}).format(date);
