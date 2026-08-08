import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type UIEvent,
} from 'react';
import './ElegantScroll.scss';

interface ElegantScrollProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  onScroll?: (event: UIEvent<HTMLDivElement>) => void;
}

export function ElegantScroll({
  children,
  className = '',
  style,
  onScroll,
}: ElegantScrollProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [thumb, setThumb] = useState({ top: 0, height: 0, visible: false });
  const dragging = useRef(false);
  const dragOffset = useRef(0);
  const thumbHeightRef = useRef(0);

  const updateThumb = useCallback(() => {
    const el = viewportRef.current;
    const track = trackRef.current;
    if (!el) return;

    const { scrollTop, scrollHeight, clientHeight } = el;
    const overflow = scrollHeight - clientHeight;
    const visible = overflow > 1;
    const trackHeight = track?.clientHeight || clientHeight;
    const height = visible
      ? Math.max(24, (clientHeight / scrollHeight) * trackHeight)
      : 0;
    const maxTop = Math.max(0, trackHeight - height);
    const top = overflow > 0 ? (scrollTop / overflow) * maxTop : 0;

    thumbHeightRef.current = height;
    setThumb({ top, height, visible });
  }, []);

  useEffect(() => {
    const el = viewportRef.current;
    const content = contentRef.current;
    if (!el) return;

    const frame = requestAnimationFrame(() => updateThumb());
    const observer = new ResizeObserver(() => updateThumb());
    observer.observe(el);
    if (content) observer.observe(content);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [updateThumb, children]);

  useEffect(() => {
    function onMove(event: MouseEvent) {
      if (!dragging.current) return;
      const el = viewportRef.current;
      const track = trackRef.current;
      if (!el || !track) return;

      const rect = track.getBoundingClientRect();
      const { scrollHeight, clientHeight } = el;
      const overflow = scrollHeight - clientHeight;
      if (overflow <= 0) return;

      const height = thumbHeightRef.current;
      const maxTop = Math.max(0, track.clientHeight - height);
      const y = event.clientY - rect.top - dragOffset.current;
      const ratio = maxTop > 0 ? Math.min(1, Math.max(0, y / maxTop)) : 0;
      el.scrollTop = ratio * overflow;
    }

    function onUp() {
      dragging.current = false;
    }

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  return (
    <div className={`elegant-scroll ${className}`.trim()} style={style}>
      <div className="elegant-scroll__clip">
        <div
          ref={viewportRef}
          className="elegant-scroll__viewport"
          onScroll={(event) => {
            updateThumb();
            onScroll?.(event);
          }}
        >
          <div ref={contentRef} className="elegant-scroll__content">
            {children}
          </div>
        </div>
      </div>
      <div
        ref={trackRef}
        className={`elegant-scroll__track ${thumb.visible ? 'is-visible' : ''}`}
        aria-hidden
        onMouseDown={(event) => {
          if (!thumb.visible) return;
          const el = viewportRef.current;
          const track = trackRef.current;
          if (!el || !track) return;
          if ((event.target as HTMLElement).closest('.elegant-scroll__thumb')) {
            return;
          }

          const rect = track.getBoundingClientRect();
          const overflow = el.scrollHeight - el.clientHeight;
          if (overflow <= 0) return;
          const ratio = Math.min(
            1,
            Math.max(0, (event.clientY - rect.top) / track.clientHeight),
          );
          el.scrollTop = ratio * overflow;
        }}
      >
        {thumb.visible && (
          <button
            type="button"
            className="elegant-scroll__thumb"
            tabIndex={-1}
            style={{ top: thumb.top, height: thumb.height }}
            onMouseDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
              dragging.current = true;
              const thumbEl = event.currentTarget;
              dragOffset.current =
                event.clientY - thumbEl.getBoundingClientRect().top;
            }}
          />
        )}
      </div>
    </div>
  );
}
