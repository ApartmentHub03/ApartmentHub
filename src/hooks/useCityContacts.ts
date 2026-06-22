import { useCity } from '@/contexts/CityContext';

export interface CityContacts {
  phone: string;
  email: string;
  address: string;
  agentName: string;
  displayLabel: string;
}

const contacts: Record<'amsterdam' | 'utrecht', CityContacts> = {
  amsterdam: {
    phone: '+31 6 83221189',
    email: 'info@apartmenthub.nl',
    address: 'Van Baerlestraat 62-2, 1017 PB Amsterdam',
    agentName: 'David van Wachem',
    displayLabel: 'Amsterdam',
  },
  utrecht: {
    phone: '+31 6 00 00 00 00',
    email: 'utrecht@apartmenthub.nl',
    address: 'Midden Nederland (adres volgt)',
    agentName: 'Nick van Straaten',
    displayLabel: 'Midden Nederland',
  },
};

export const useCityContacts = (): CityContacts => {
  const { city } = useCity();
  return contacts[city ?? 'amsterdam'];
};
