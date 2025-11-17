import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../domain/entities/order_with_payment_entity.dart';
import '../bloc/kasir_bloc.dart';
import '../bloc/kasir_event.dart';

class OrderPaymentCard extends StatelessWidget {
  final OrderWithPaymentEntity orderWithPayment;

  const OrderPaymentCard({super.key, required this.orderWithPayment});

  @override
  Widget build(BuildContext context) {
    final order = orderWithPayment.order;
    final payment = orderWithPayment.payment;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: _getStatusColor(),
          child: Text(order.orderNumber.substring(order.orderNumber.length - 3)),
        ),
        title: Text(
          'Order ${order.orderNumber}',
          style: const TextStyle(fontWeight: FontWeight.bold),
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('${order.tableNumber} • ${order.items.length} items'),
            if (payment != null)
              Text('${payment.paymentMethodLabel} • ${payment.status}'),
          ],
        ),
        trailing: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Text(
              'Rp ${orderWithPayment.totalAmount.toStringAsFixed(0)}',
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            if (payment?.needsVerification ?? false)
              ElevatedButton(
                onPressed: () => _verifyPayment(context),
                child: const Text('Verifikasi'),
              ),
          ],
        ),
      ),
    );
  }

  Color _getStatusColor() {
    if (orderWithPayment.payment == null) return Colors.orange;
    if (orderWithPayment.isPaymentVerified) return Colors.green;
    return Colors.blue;
  }

  void _verifyPayment(BuildContext context) {
    if (orderWithPayment.payment != null) {
      context.read<KasirBloc>().add(VerifyPayment(orderWithPayment.payment!.id));
    }
  }
}
