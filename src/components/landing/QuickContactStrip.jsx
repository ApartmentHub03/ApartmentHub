'use client';

import { MessageCircle, Phone, Mail } from 'lucide-react';
import useServiceContacts from '../../hooks/useServiceContacts';
import styles from './QuickContactStrip.module.css';

const QuickContactStrip = ({ service, whatsappLabel, phoneLabel, emailLabel }) => {
    const contacts = useServiceContacts(service);
    const phoneTel = contacts.phone.replace(/\s/g, '');

    return (
        <div className={styles.strip}>
            <a href={contacts.whatsappLink} target="_blank" rel="noreferrer" className={styles.link}>
                <MessageCircle size={16} className={styles.icon} /> {whatsappLabel || 'WhatsApp'}
            </a>
            <a href={`tel:${phoneTel}`} className={styles.link}>
                <Phone size={16} className={styles.icon} /> {phoneLabel || contacts.phone}
            </a>
            <a href={`mailto:${contacts.email}`} className={styles.link}>
                <Mail size={16} className={styles.icon} /> {emailLabel || 'Email'}
            </a>
        </div>
    );
};

export default QuickContactStrip;