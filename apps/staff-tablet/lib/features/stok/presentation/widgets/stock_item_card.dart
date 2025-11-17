import 'package:flutter/material.dart';

import '../../domain/entities/stock_item_entity.dart';

class StockItemCard extends StatelessWidget {
  final StockItemEntity item;

  const StockItemCard({super.key, required this.item});

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: _getStatusColor(),
          child: Text(
            item.currentStock.toStringAsFixed(0),
            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
          ),
        ),
        title: Text(item.name, style: const TextStyle(fontWeight: FontWeight.bold)),
        subtitle: Text('${item.code} • ${item.category}'),
        trailing: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Text(
              '${item.currentStock.toStringAsFixed(1)} ${item.unit}',
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            Text(
              'Min: ${item.minStock.toStringAsFixed(1)}',
              style: TextStyle(fontSize: 12, color: Colors.grey[600]),
            ),
          ],
        ),
        onTap: () {
          // TODO: Navigate to stock detail page
        },
      ),
    );
  }

  Color _getStatusColor() {
    if (item.isCriticalStock) return Colors.red;
    if (item.isLowStock) return Colors.orange;
    return Colors.green;
  }
}
