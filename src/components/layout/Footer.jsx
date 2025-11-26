import React from 'react';
import { Link } from 'react-router-dom';
import styles from './Footer.module.css';

const Footer = () => {
    return (
        <footer className={styles.footer}>
            <div className={styles.container}>
                <div className={styles.grid}>
                    <div className={styles.brandCol}>
                        <div className={styles.brandHeader}>
                            <div className={styles.logoBox}>
                                <span className={styles.logoText}>AH</span>
                            </div>
                            <span className={styles.brandName}>ApartmentHub</span>
                        </div>
                        <p className={styles.description}>
                            Lovable homes deserve lovable service. We help connect property owners with tenants through our trusted platform.
                        </p>
                        <p className={styles.email}>
                            Email: <a href="mailto:hello@apartmenthub.com" className={styles.emailLink}>hello@apartmenthub.com</a>
                        </p>
                    </div>

                    <div>
                        <h3 className={styles.heading}>Quick Links</h3>
                        <ul className={styles.linkList}>
                            <li><Link to="/en/rent-out" className={styles.link}>Rent Out</Link></li>
                            <li><Link to="/en/rent-in" className={styles.link}>Rent In</Link></li>
                            <li><Link to="/en/about-us" className={styles.link}>About Us</Link></li>
                            <li><Link to="/en/faq" className={styles.link}>FAQ</Link></li>
                            <li><Link to="/en/terms-and-conditions" className={styles.link}>Terms & Conditions</Link></li>
                            <li><Link to="/en/privacy-policy" className={styles.link}>Privacy Policy</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h3 className={styles.heading}>Newsletter</h3>
                        <form className={styles.form}>
                            <input
                                type="email"
                                placeholder="Enter your email"
                                className={styles.input}
                                required
                            />
                            <button type="submit" className={styles.button}>Subscribe</button>
                        </form>
                    </div>
                </div>

                <div className={styles.bottomBar}>
                    <div className={styles.socials}>
                        <a
                            href="https://www.instagram.com/apartmenthub/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.socialLink}
                        >
                            Instagram
                        </a>
                        <a
                            href="https://www.linkedin.com/company/apartmenthub/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.socialLink}
                        >
                            LinkedIn
                        </a>
                    </div>
                    <p className={styles.copyright}>© 2024 ApartmentHub. All rights reserved.</p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
