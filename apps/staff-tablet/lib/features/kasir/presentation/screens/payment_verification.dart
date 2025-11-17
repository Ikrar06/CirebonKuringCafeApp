import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../bloc/kasir_bloc.dart';
import '../bloc/kasir_state.dart';
import '../widgets/order_payment_card.dart';

class PaymentVerificationScreen extends StatelessWidget {
  const PaymentVerificationScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Verifikasi Pembayaran'),
      ),
      body: BlocBuilder<KasirBloc, KasirState>(
        builder: (context, state) {
          if (state is KasirLoading || state is KasirInitial) {
            return const Center(child: CircularProgressIndicator());
          }

          if (state is KasirLoaded) {
            final pendingPayments = state.pendingPayments;

            if (pendingPayments.isEmpty) {
              return Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.check_circle_outline, size: 80, color: Colors.grey[400]),
                    const SizedBox(height: 16),
                    Text(
                      'Semua pembayaran sudah diverifikasi',
                      style: TextStyle(fontSize: 18, color: Colors.grey[600]),
                    ),
                  ],
                ),
              );
            }

            return ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: pendingPayments.length,
              itemBuilder: (context, index) {
                return OrderPaymentCard(orderWithPayment: pendingPayments[index]);
              },
            );
          }

          if (state is KasirError) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.error_outline, size: 80, color: Colors.red),
                  const SizedBox(height: 16),
                  Text(
                    'Error: ${state.message}',
                    style: const TextStyle(fontSize: 16),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            );
          }

          return const Center(child: Text('Tidak ada data'));
        },
      ),
    );
  }
}
