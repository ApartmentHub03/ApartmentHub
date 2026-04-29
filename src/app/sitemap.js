const BASE_URL = 'https://apartmenthub.nl';

export default function sitemap() {
  const now = new Date().toISOString();

  // Define all public pages with their locale variants
  const pages = [
    // Homepage
    {
      url: `${BASE_URL}/`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1.0,
      alternates: {
        languages: {
          en: `${BASE_URL}/en`,
          nl: `${BASE_URL}/nl`,
        },
      },
    },
    // Rent In
    {
      url: `${BASE_URL}/en/rent-in`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.9,
      alternates: {
        languages: {
          en: `${BASE_URL}/en/rent-in`,
          nl: `${BASE_URL}/nl/rent-in`,
        },
      },
    },
    {
      url: `${BASE_URL}/nl/rent-in`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.9,
      alternates: {
        languages: {
          en: `${BASE_URL}/en/rent-in`,
          nl: `${BASE_URL}/nl/rent-in`,
        },
      },
    },
    // Rent Out
    {
      url: `${BASE_URL}/en/rent-out`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.9,
      alternates: {
        languages: {
          en: `${BASE_URL}/en/rent-out`,
          nl: `${BASE_URL}/nl/rent-out`,
        },
      },
    },
    {
      url: `${BASE_URL}/nl/rent-out`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.9,
      alternates: {
        languages: {
          en: `${BASE_URL}/en/rent-out`,
          nl: `${BASE_URL}/nl/rent-out`,
        },
      },
    },
    // Apartments
    {
      url: `${BASE_URL}/en/apartments`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.9,
      alternates: {
        languages: {
          en: `${BASE_URL}/en/apartments`,
          nl: `${BASE_URL}/nl/appartementen`,
        },
      },
    },
    {
      url: `${BASE_URL}/nl/appartementen`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.9,
      alternates: {
        languages: {
          en: `${BASE_URL}/en/apartments`,
          nl: `${BASE_URL}/nl/appartementen`,
        },
      },
    },
    // Neighborhoods
    {
      url: `${BASE_URL}/en/neighborhoods`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
      alternates: {
        languages: {
          en: `${BASE_URL}/en/neighborhoods`,
          nl: `${BASE_URL}/nl/neighborhoods`,
        },
      },
    },
    {
      url: `${BASE_URL}/nl/neighborhoods`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
      alternates: {
        languages: {
          en: `${BASE_URL}/en/neighborhoods`,
          nl: `${BASE_URL}/nl/neighborhoods`,
        },
      },
    },
    // About Us
    {
      url: `${BASE_URL}/en/about-us`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
      alternates: {
        languages: {
          en: `${BASE_URL}/en/about-us`,
          nl: `${BASE_URL}/nl/about-us`,
        },
      },
    },
    {
      url: `${BASE_URL}/nl/about-us`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
      alternates: {
        languages: {
          en: `${BASE_URL}/en/about-us`,
          nl: `${BASE_URL}/nl/about-us`,
        },
      },
    },
    // FAQ
    {
      url: `${BASE_URL}/en/faq`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
      alternates: {
        languages: {
          en: `${BASE_URL}/en/faq`,
          nl: `${BASE_URL}/nl/faq`,
        },
      },
    },
    {
      url: `${BASE_URL}/nl/faq`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
      alternates: {
        languages: {
          en: `${BASE_URL}/en/faq`,
          nl: `${BASE_URL}/nl/faq`,
        },
      },
    },
    // Discover More
    {
      url: `${BASE_URL}/en/discover-more`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.7,
      alternates: {
        languages: {
          en: `${BASE_URL}/en/discover-more`,
          nl: `${BASE_URL}/nl/discover-more`,
        },
      },
    },
    {
      url: `${BASE_URL}/nl/discover-more`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.7,
      alternates: {
        languages: {
          en: `${BASE_URL}/en/discover-more`,
          nl: `${BASE_URL}/nl/discover-more`,
        },
      },
    },
    // Contact
    {
      url: `${BASE_URL}/en/contact`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
      alternates: {
        languages: {
          en: `${BASE_URL}/en/contact`,
          nl: `${BASE_URL}/nl/contact`,
        },
      },
    },
    {
      url: `${BASE_URL}/nl/contact`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
      alternates: {
        languages: {
          en: `${BASE_URL}/en/contact`,
          nl: `${BASE_URL}/nl/contact`,
        },
      },
    },
    // Press / Media Kit
    {
      url: `${BASE_URL}/en/press`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.6,
      alternates: {
        languages: {
          en: `${BASE_URL}/en/press`,
          nl: `${BASE_URL}/nl/press`,
        },
      },
    },
    {
      url: `${BASE_URL}/nl/press`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.6,
      alternates: {
        languages: {
          en: `${BASE_URL}/en/press`,
          nl: `${BASE_URL}/nl/press`,
        },
      },
    },
    // Privacy Policy
    {
      url: `${BASE_URL}/en/privacy-policy`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
      alternates: {
        languages: {
          en: `${BASE_URL}/en/privacy-policy`,
          nl: `${BASE_URL}/nl/privacyverklaring`,
        },
      },
    },
    {
      url: `${BASE_URL}/nl/privacyverklaring`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
      alternates: {
        languages: {
          en: `${BASE_URL}/en/privacy-policy`,
          nl: `${BASE_URL}/nl/privacyverklaring`,
        },
      },
    },
    // Terms and Conditions
    {
      url: `${BASE_URL}/en/terms-and-conditions`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
      alternates: {
        languages: {
          en: `${BASE_URL}/en/terms-and-conditions`,
          nl: `${BASE_URL}/nl/algemene-voorwaarden`,
        },
      },
    },
    {
      url: `${BASE_URL}/nl/algemene-voorwaarden`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
      alternates: {
        languages: {
          en: `${BASE_URL}/en/terms-and-conditions`,
          nl: `${BASE_URL}/nl/algemene-voorwaarden`,
        },
      },
    },
  ];

  return pages;
}
