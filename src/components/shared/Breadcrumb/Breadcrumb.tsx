import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import styles from './Breadcrumb.module.css';

export interface BreadcrumbItem {
    label: string;
    href?: string;
}

interface BreadcrumbProps {
    items: BreadcrumbItem[];
    showBack?: boolean;
}

const ArrowLeftIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
);

const HomeIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '2px' }}>
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
);

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ items, showBack = true }) => {
    const navigate = useNavigate();

    return (
        <div className={styles.breadcrumbWrapper}>
            {showBack && (
                <>
                    <button 
                        className={styles.backButton} 
                        onClick={() => navigate(-1)} 
                        aria-label="Quay lại"
                    >
                        <ArrowLeftIcon />
                        <span>Quay lại</span>
                    </button>
                    <div className={styles.divider}></div>
                </>
            )}
            
            <nav className={styles.breadcrumbNav} aria-label="Breadcrumb">
                <ol className={styles.breadcrumbList}>
                    {items.map((item, index) => {
                        const isLast = index === items.length - 1;
                        const isFirst = index === 0;
                        
                        return (
                            <li 
                                key={index} 
                                className={`${styles.breadcrumbItem} ${isLast ? styles.active : ''}`}
                            >
                                {item.href && !isLast ? (
                                    <Link to={item.href} className={styles.breadcrumbLink}>
                                        {isFirst && <HomeIcon />}
                                        {item.label}
                                    </Link>
                                ) : (
                                    <span className={styles.breadcrumbText}>
                                        {isFirst && <HomeIcon />}
                                        {item.label}
                                    </span>
                                )}
                                {!isLast && (
                                    <span className={styles.separator}>/</span>
                                )}
                            </li>
                        );
                    })}
                </ol>
            </nav>
        </div>
    );
};

