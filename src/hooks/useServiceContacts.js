import { useSelector } from 'react-redux';

const SERVICE_CONTACTS = {
    koop: {
        amsterdam: {
            name: 'Kaj Velthuyse',
            phone: '+31 6 41439378',
            email: 'kaj@apartmenthub.nl',
            whatsappLink: 'https://wa.me/31641439378',
        },
        utrecht: {
            name: 'Kaj Velthuyse',
            phone: '+31 6 34333809',
            email: 'kaj@apartmenthub.nl',
            whatsappLink: 'https://wa.me/31634333809',
        },
    },
    verkoop: {
        amsterdam: {
            name: 'David van Wachem',
            phone: '+31 6 83221189',
            email: 'info@apartmenthub.nl',
            whatsappLink: 'https://wa.me/31683221189',
        },
        utrecht: {
            name: 'David van Wachem',
            phone: '+31 6 34333809',
            email: 'info@apartmenthub.nl',
            whatsappLink: 'https://wa.me/31634333809',
        },
    },
};

export const WHATSAPP_API_LINKS = {
    amsterdam: 'https://api.whatsapp.com/send/?phone=31658975449&text&type=phone_number&app_absent=0',
    utrecht: 'https://api.whatsapp.com/send/?phone=31634333809&text&type=phone_number&app_absent=0',
};

export const useServiceContacts = (service) => {
    const city = useSelector((state) => state.ui.city || 'amsterdam');
    const contacts = SERVICE_CONTACTS[service] || SERVICE_CONTACTS.koop;
    return contacts[city] || contacts.amsterdam;
};

export default useServiceContacts;