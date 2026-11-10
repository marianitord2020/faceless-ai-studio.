// Publisher-provided feeds verified during integration; availability may change.
// region refers to the publisher, not necessarily the location of every article.
export const NEWS_SOURCES=[
 {name:'Diario Libre',region:'RD',url:'https://www.diariolibre.com/rss/actualidad.xml',context:'República Dominicana noticias nacionales'},
 {name:'Diario Libre',region:'RD',url:'https://www.diariolibre.com/rss/portada.xml'},
 {name:'Diario Libre',region:'RD',url:'https://www.diariolibre.com/rss/revista.xml',topics:['entertainment']},
 {name:'Listín Diario',region:'RD',url:'https://listindiario.com/sitemap-google-news.xml',sitemap:true},
 {name:'El Nuevo Diario',region:'RD',url:'https://elnuevodiario.com.do/feed/'},
 {name:'Hoy',region:'RD',url:'https://hoy.com.do/rss/home.xml'},
 {name:'El Día',region:'RD',url:'https://eldia.com.do/feed/'},
 {name:'El Nacional',region:'RD',url:'https://elnacional.com.do/rss/home.xml'},
 {name:'El Caribe',region:'RD',url:'https://www.elcaribe.com.do/news-sitemap.xml',sitemap:true},
 {name:'CDN',region:'RD',url:'https://cdn.com.do/sitemaps/sitemapnews.xml',sitemap:true},
 {name:'De Último Minuto',region:'RD',url:'https://deultimominuto.com/feed/',topics:['entertainment']},
 {name:'N Digital',region:'RD',url:'https://n.com.do/feed/'},
 {name:'Remolacha',region:'RD',url:'https://remolacha.net/feed/',topics:['entertainment']},
 {name:'Más VIP',region:'RD',url:'https://masvip.com.do/feed/',topics:['entertainment'],entertainment:true},
 {name:'Luminarias TV',region:'RD',url:'https://luminariastv.com/feed/',topics:['entertainment'],entertainment:true},
 {name:'Roberto Cavada',region:'RD',url:'https://robertocavada.com/feed/'},
 {name:'BBC Mundo',region:'global',url:'https://feeds.bbci.co.uk/mundo/rss.xml',hosts:['bbc.com','bbc.co.uk'],context:'noticias mundo internacionales'},
 {name:'Infobae',region:'global',url:'https://www.infobae.com/arc/outboundfeeds/rss/',topics:['entertainment']},
 {name:'EL PAÍS',region:'ES',url:'https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/portada',hosts:['elpais.com']},
 {name:'20minutos',region:'ES',url:'https://www.20minutos.es/rss/'},
 {name:'elDiario.es',region:'ES',url:'https://www.eldiario.es/rss/'},
 {name:'¡HOLA!',region:'ES',url:'https://www.hola.com/feeds/rss/es/any/any/50.xml',topics:['entertainment'],entertainment:true},
 {name:'La Nación',region:'AR',url:'https://www.lanacion.com.ar/arc/outboundfeeds/rss/'},
 {name:'El Universo',region:'EC',url:'https://www.eluniverso.com/arc/outboundfeeds/rss/?outputType=xml'}
];
export function sourceSummary(){return {publishers:new Set(NEWS_SOURCES.map(f=>f.name)).size,channels:NEWS_SOURCES.length,dominicanPublishers:new Set(NEWS_SOURCES.filter(f=>f.region==='RD').map(f=>f.name)).size}}
