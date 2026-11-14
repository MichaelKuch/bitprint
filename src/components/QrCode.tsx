import { Component } from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface QrCodeProps {
  value: string;
  size: number;
}

interface QrCodeState {
  failed: boolean;
}

/**
 * QRCodeSVG throws while rendering when the value exceeds what a QR code can
 * hold (~2.9 kB). This catches that so one large item cannot take down the page.
 * Give it a `key` that changes with the value so it retries after a failure.
 */
export default class QrCode extends Component<QrCodeProps, QrCodeState> {
  state: QrCodeState = { failed: false };

  static getDerivedStateFromError(): QrCodeState {
    return { failed: true };
  }

  render() {
    const { value, size } = this.props;

    if (this.state.failed) {
      return (
        <div
          className="flex items-center justify-center text-center text-xs text-gray-500 p-4"
          style={{ width: size, height: size }}
        >
          Too much data for a QR code
        </div>
      );
    }

    return <QRCodeSVG value={value} size={size} />;
  }
}
