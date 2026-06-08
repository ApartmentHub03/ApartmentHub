import React from 'react';
import { MapPin, Bed, Bath, Maximize } from 'lucide-react';
import styles from './PropertyCard.module.css';

const PropertyCard = ({ property }) => {
    return (
        <div className={styles.card}>
            <div className={styles.imageContainer}>
                <img
                    src={property.imageUrl}
                    alt={`${property.title} - apartment for rent in ${property.location || 'Amsterdam'}`}
                    className={styles.image}
                    loading="lazy"
                    decoding="async"
                />
                <span className={styles.price}>€{property.price}/mo</span>
            </div>
            <div className={styles.content}>
                <h3 className={styles.title}>{property.title}</h3>
                <div className={styles.location}>
                    <MapPin size={16} />
                    <span>{property.location}</span>
                </div>
                <div className={styles.features}>
                    <div className={styles.feature}>
                        <Bed size={16} />
                        <span>{property.bedrooms} Bed</span>
                    </div>
                    <div className={styles.feature}>
                        <Bath size={16} />
                        <span>{property.bathrooms} Bath</span>
                    </div>
                    <div className={styles.feature}>
                        <Maximize size={16} />
                        <span>{property.area} m²</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PropertyCard;
