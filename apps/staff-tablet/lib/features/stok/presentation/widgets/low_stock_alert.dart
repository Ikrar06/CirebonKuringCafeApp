import 'package:flutter/material.dart';

import '../../domain/entities/stock_item_entity.dart';

class LowStockAlert extends StatelessWidget {
  final List<StockItemEntity> lowStockItems;

  const LowStockAlert({super.key, required this.lowStockItems});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.orange.shade50,
        border: Border.all(color: Colors.orange),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          const Icon(Icons.warning, color: Colors.orange),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              '${lowStockItems.length} item stok menipis',
              style: const TextStyle(fontWeight: FontWeight.bold),
            ),
          ),
        ],
      ),
    );
  }
}
