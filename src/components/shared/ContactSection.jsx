'use client';

import React from 'react';
import Link from 'next/link';
import useServiceContacts from '../../hooks/useServiceContacts';
import { Phone, Mail, MessageCircle } from 'lucide-react';
import styles from './ContactSection.module.css';

const ContactSection = ({ service, ctaLink, ctaLabel, title, description, isNl }) => {
    const contacts = useServiceContacts(service);
    const telHref = `tel:${contacts.phone.replace(/\s/g, '')}`;

    return (
        <section id="contact" className={styles.contactSection}>
            <div className={styles.contactContainer}>
                <h2 className={styles.contactTitle}>{title}</h2>
                <p className={styles.contactDesc}>{description}</p>
                <div className={styles.contactCard}>
                    <a href={telHref} className={styles.contactPhone}>{contacts.phone}</a>
                    <div className={styles.contactInfoList}>
                        <a href={telHref} className={styles.contactInfoItem}>
                            <Phone size={18} className={styles.contactInfoIcon} />
                            {contacts.phone}
                        </a>
                        <a href={`mailto:${contacts.email}`} className={styles.contactInfoItem}>
                            <Mail size={18} className={styles.contactInfoIcon} />
                            {contacts.email}
                        </a>
                        <a href={contacts.whatsappLink} target="_blank" rel="noopener noreferrer" className={styles.contactInfoItem}>
                            <MessageCircle size={18} className={styles.contactInfoIcon} />
                            WhatsApp
                        </a>
                    </div>
                    <Link href={ctaLink} className={styles.ctaPrimary}>{ctaLabel}</Link>
                </div>
            </div>
        </section>
    );
};

export default ContactSection;