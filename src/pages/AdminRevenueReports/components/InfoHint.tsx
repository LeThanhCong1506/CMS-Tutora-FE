import React, { useCallback, useRef, useState } from 'react';

type Align = 'left' | 'right';

/**
 * Icon ⓘ kèm hộp giải thích.
 */
const InfoHint: React.FC<{ text: string }> = ({ text }) => {
    const ref = useRef<HTMLSpanElement>(null);
    const [align, setAlign] = useState<Align>('left');

    const decideAlign = useCallback(() => {
        const el = ref.current;
        if (!el) return;
        const BOX_WIDTH = 280;
        const MARGIN = 12;
        const { left } = el.getBoundingClientRect();
        const fitsRight = left + BOX_WIDTH + MARGIN <= window.innerWidth;
        setAlign(fitsRight ? 'left' : 'right');
    }, []);

    return (
        <span
            ref={ref}
            className={`rev-info rev-info-${align}`}
            tabIndex={0}
            role="note"
            aria-label={text}
            onMouseEnter={decideAlign}
            onFocus={decideAlign}
        >
            <span className="material-symbols-outlined">info</span>
            <span className="rev-infobox">{text}</span>
        </span>
    );
};

export default InfoHint;
