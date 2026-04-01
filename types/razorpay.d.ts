declare module 'react-native-razorpay' {
    interface RazorpayOptions {
        description?: string;
        image?: string;
        currency: string;
        key: string;
        amount: number;
        name: string;
        prefill?: {
            email?: string;
            contact?: string;
            name?: string;
        };
        theme?: {
            color?: string;
        };
        notes?: {
            [key: string]: string;
        };
    }

    export default class RazorpayCheckout {
        static open(options: RazorpayOptions): Promise<{ razorpay_payment_id: string }>;
    }
}
