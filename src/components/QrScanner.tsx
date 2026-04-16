'use client'

import { useCallback, useEffect, useRef, useState } from 'react';

interface Html5QrcodeScannerInstance {
    clear: () => Promise<void> | void;
    render: (
        onSuccess: (decodedText: string) => void,
        onError: (errorMessage: string) => void
    ) => void;
}

interface Html5QrcodeScannerConstructor {
    new (
        elementId: string,
        config: {
            fps: number;
            qrbox: { width: number; height: number };
            rememberLastUsedCamera: boolean;
            showTorchButtonIfSupported: boolean;
        },
        verbose: boolean
    ): Html5QrcodeScannerInstance;
}

interface QrScannerProps {
    onScanSuccess: (address: string) => void;
    onScanError?: (error: string) => void;
}

export function QrScanner({ onScanSuccess, onScanError }: QrScannerProps) {
    const [isScanning, setIsScanning] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const scannerRef = useRef<Html5QrcodeScannerInstance | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const scanner = useRef<Html5QrcodeScannerConstructor | null>(null);

    const stopScanning = useCallback(() => {
        if (scannerRef.current) {
            try {
                scannerRef.current.clear();
                scannerRef.current = null;

                if (containerRef.current) {
                    containerRef.current.innerHTML = '';
                }
            } catch (error) {
                console.error("Error stopping scanner:", error);
            }
            setIsScanning(false);
        }
    }, []);

    const startScanning = useCallback(async () => {
        if (isLoading || !scanner.current || !containerRef.current) return;
        
        try {
            // Create a unique ID for the scanner div
            const scannerId = 'qr-scanner-' + Date.now();
            
            // Create and append the scanner div
            const scannerDiv = document.createElement('div');
            scannerDiv.id = scannerId;
            containerRef.current.innerHTML = ''; // Clear any previous content
            containerRef.current.appendChild(scannerDiv);
            
            // Now initialize the scanner with the newly created div
            const Html5QrcodeScanner = scanner.current;
            scannerRef.current = new Html5QrcodeScanner(
                scannerId,
                { 
                    fps: 10, 
                    qrbox: { width: 250, height: 250 },
                    rememberLastUsedCamera: true,
                    showTorchButtonIfSupported: true
                },
                false
            );
            
            setIsScanning(true);
            
            // Render the scanner
            scannerRef.current.render(
                (decodedText: string) => {
                    stopScanning();
                    onScanSuccess(decodedText);
                },
                (errorMessage: string) => {
                    // This is just an error during scanning, not a fatal error
                    console.warn("QR scan error:", errorMessage);
                }
            );
        } catch (error) {
            console.error("Failed to initialize scanner:", error);
            setIsScanning(false);
            if (onScanError) {
                onScanError("Failed to initialize QR scanner");
            }
        }
    }, [isLoading, onScanError, onScanSuccess, stopScanning]);

    // Load the HTML5 QR Scanner library only on the client side
    useEffect(() => {
        const loadScanner = async () => {
            try {
                const Html5QrcodeScanner = (await import('html5-qrcode')).Html5QrcodeScanner;
                scanner.current = Html5QrcodeScanner as Html5QrcodeScannerConstructor;
                setIsLoading(false);
            } catch (error) {
                console.error("Failed to load QR scanner library:", error);
                if (onScanError) {
                    onScanError("Failed to load QR scanner library");
                }
            }
        };

        loadScanner();

        return () => {
            stopScanning();
        };
    }, [onScanError, stopScanning]);

    // Start scanning automatically when the component mounts - no button needed
    useEffect(() => {
        if (!isLoading && !isScanning && scanner.current && containerRef.current) {
            startScanning();
        }
    }, [isLoading, isScanning, startScanning]);

    if (isLoading) {
        return <div className="text-center p-4">Loading scanner...</div>;
    }

    return (
        <div className="w-full max-w-md mx-auto">
            <div ref={containerRef} className="bg-dark rounded-lg overflow-hidden min-h-[300px]" />
        </div>
    );
}
