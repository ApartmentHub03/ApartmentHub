const SERVICE_CONTACTS = {
    koop: {
        name: 'Kaj Velthuyse',
        phone: '+31 6 41439378',
        email: 'kaj@apartmenthub.nl',
        whatsappLink: 'https://wa.me/31641439378',
    },
    verkoop: {
        name: 'David van Wachem',
        phone: '+31 6 83221189',
        email: 'info@apartmenthub.nl',
        whatsappLink: 'https://wa.me/31683221189',
    },
};

export const useServiceContacts = (service) => {
    return SERVICE_CONTACTS[service] || SERVICE_CONTACTS.koop;
};

export default useServiceContacts;