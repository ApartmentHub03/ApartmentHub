import { translations } from '@/data/translations';

const FAQSchema = ({ lang = 'en' }) => {
    const faq = translations.faq[lang] || translations.faq.en;

    const questions = [];
    for (let i = 1; i <= 8; i++) {
        const q = faq[`q${i}`];
        const a = faq[`a${i}`];
        if (q && a) {
            questions.push({
                '@type': 'Question',
                name: q,
                acceptedAnswer: {
                    '@type': 'Answer',
                    text: a,
                },
            });
        }
    }

    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        inLanguage: lang === 'nl' ? 'nl-NL' : 'en-US',
        mainEntity: questions,
    };

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
    );
};

export default FAQSchema;
