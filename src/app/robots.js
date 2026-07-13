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
          // Internal tools — keep the team login pages out of the index.
          '/crm', '/crm-admin', '/admin', '/api',
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
          // Internal tools — keep the team login pages out of the index.
          '/crm', '/crm-admin', '/admin', '/api',
        ],
      },
    ],
    sitemap: 'https://apartmenthub.nl/sitemap.xml',
    host: 'https://apartmenthub.nl',
  };
}
