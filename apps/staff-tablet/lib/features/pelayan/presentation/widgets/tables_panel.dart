import 'package:flutter/material.dart';

import '../../domain/entities/table_entity.dart';

class TablesPanel extends StatelessWidget {
  final List<TableEntity> tables;

  const TablesPanel({super.key, required this.tables});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Padding(
          padding: EdgeInsets.all(16.0),
          child: Text(
            'Daftar Meja',
            style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
          ),
        ),
        Expanded(
          child: GridView.builder(
            padding: const EdgeInsets.all(16),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 4,
              childAspectRatio: 1.5,
              crossAxisSpacing: 12,
              mainAxisSpacing: 12,
            ),
            itemCount: tables.length,
            itemBuilder: (context, index) {
              final table = tables[index];
              return _TableCard(table: table);
            },
          ),
        ),
      ],
    );
  }
}

class _TableCard extends StatelessWidget {
  final TableEntity table;

  const _TableCard({required this.table});

  @override
  Widget build(BuildContext context) {
    return Card(
      color: _getStatusColor(),
      child: InkWell(
        onTap: () {
          // Navigate to table detail or order
        },
        child: Padding(
          padding: const EdgeInsets.all(12.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                'Meja ${table.tableNumber}',
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                table.status.toUpperCase(),
                style: const TextStyle(
                  fontSize: 12,
                  color: Colors.white70,
                ),
              ),
              if (table.occupiedDurationMinutes != null)
                Text(
                  '${table.occupiedDurationMinutes} min',
                  style: const TextStyle(
                    fontSize: 10,
                    color: Colors.white60,
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  Color _getStatusColor() {
    if (table.isAvailable) return Colors.green;
    if (table.isOccupied) return Colors.orange;
    if (table.isReserved) return Colors.blue;
    if (table.isCleaning) return Colors.grey;
    return Colors.grey;
  }
}
