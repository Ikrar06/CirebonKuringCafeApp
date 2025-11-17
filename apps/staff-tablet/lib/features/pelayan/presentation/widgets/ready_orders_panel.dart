import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../domain/entities/order_with_table_entity.dart';
import '../bloc/pelayan_bloc.dart';
import '../bloc/pelayan_event.dart';

class ReadyOrdersPanel extends StatelessWidget {
  final List<OrderWithTableEntity> readyOrders;

  const ReadyOrdersPanel({super.key, required this.readyOrders});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.all(16.0),
          child: Text(
            'Pesanan Siap (${readyOrders.length})',
            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
        ),
        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            itemCount: readyOrders.length,
            itemBuilder: (context, index) {
              final orderWithTable = readyOrders[index];
              return _ReadyOrderCard(orderWithTable: orderWithTable);
            },
          ),
        ),
      ],
    );
  }
}

class _ReadyOrderCard extends StatelessWidget {
  final OrderWithTableEntity orderWithTable;

  const _ReadyOrderCard({required this.orderWithTable});

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(12.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  orderWithTable.tableDisplay,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                Text(
                  orderWithTable.order.orderNumber,
                  style: TextStyle(
                    fontSize: 14,
                    color: Colors.grey[600],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              '${orderWithTable.order.items.length} items',
              style: TextStyle(color: Colors.grey[600]),
            ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: () => _deliverOrder(context),
                icon: const Icon(Icons.check),
                label: const Text('Antar ke Meja'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.green,
                  foregroundColor: Colors.white,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _deliverOrder(BuildContext context) {
    context.read<PelayanBloc>().add(DeliverOrder(orderWithTable.order.id));
  }
}
