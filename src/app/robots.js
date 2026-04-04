export default function robots() {
  return {
    rules: [
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: [
          '/login', '/signup', '/aanvraag', '/application',
          '/letter-of-intent', '/intentieverklaring',
          '/en/login', '/nl/login', '/en/signup', '/nl/signup',
          '/en/application', '/nl/aanvraag',
          '/en/letter-of-intent', '/nl/intentieverklaring',
          '/deal-response', '/en/deal-response',
        ],
      },
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/login', '/signup', '/aanvraag', '/application',
          '/letter-of-intent', '/intentieverklaring',
          '/en/login', '/nl/login', '/en/signup', '/nl/signup',
          '/en/application', '/nl/aanvraag',
          '/en/letter-of-intent', '/nl/intentieverklaring',
          '/deal-response', '/en/deal-response',
        ],
      },
    ],
    sitemap: 'https://apartmenthub.nl/sitemap.xml',
    host: 'https://apartmenthub.nl',
  };
}
