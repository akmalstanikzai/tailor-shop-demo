import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

interface BarcodeViewProps {
  value: string;
  format?: 'CODE128' | 'EAN13' | 'pharmacode';
  width?: number;
  height?: number;
  displayValue?: boolean;
  fontSize?: number;
  className?: string;
}

export const BarcodeView: React.FC<BarcodeViewProps> = ({
  value,
  format = 'CODE128',
  width = 1.6,
  height = 36,
  displayValue = true,
  fontSize = 11,
  className = '',
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (svgRef.current && value) {
      try {
        JsBarcode(svgRef.current, value, {
          format,
          width,
          height,
          displayValue,
          fontSize,
          margin: 2,
          textMargin: 1,
          font: 'monospace',
          textAlign: 'center',
          background: 'transparent',
          lineColor: '#000000',
        });
      } catch (err) {
        console.warn('Could not generate barcode for:', value, err);
      }
    }
  }, [value, format, width, height, displayValue, fontSize]);

  if (!value) return null;

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <svg ref={svgRef} className="max-w-full overflow-visible" />
    </div>
  );
};
