import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:uuid/uuid.dart';

import '../../../../core/utils/auth_helper.dart';
import '../../domain/entities/stock_movement_entity.dart';
import '../bloc/stock_bloc.dart';
import '../bloc/stock_event.dart';
import '../bloc/stock_state.dart';

class StockOutDialog extends StatefulWidget {
  const StockOutDialog({super.key});

  @override
  State<StockOutDialog> createState() => _StockOutDialogState();
}

class _StockOutDialogState extends State<StockOutDialog> {
  final _formKey = GlobalKey<FormState>();
  final _quantityController = TextEditingController();
  final _reasonController = TextEditingController();
  String? _selectedStockItemId;

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Stok Keluar'),
      content: BlocBuilder<StockBloc, StockState>(
        builder: (context, state) {
          if (state is! StockLoaded) {
            return const SizedBox(
              height: 200,
              child: Center(child: CircularProgressIndicator()),
            );
          }

          return Form(
            key: _formKey,
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  DropdownButtonFormField<String>(
                    initialValue: _selectedStockItemId,
                    decoration: const InputDecoration(labelText: 'Item Stok'),
                    items: state.items.map((item) {
                      return DropdownMenuItem(
                        value: item.id,
                        child: Text('${item.name} (${item.currentStock} ${item.unit})'),
                      );
                    }).toList(),
                    onChanged: (value) => setState(() => _selectedStockItemId = value),
                    validator: (value) => value == null ? 'Pilih item stok' : null,
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: _quantityController,
                    decoration: const InputDecoration(labelText: 'Jumlah'),
                    keyboardType: TextInputType.number,
                    validator: (value) {
                      if (value == null || value.isEmpty) return 'Masukkan jumlah';
                      final qty = double.tryParse(value);
                      if (qty == null) return 'Jumlah tidak valid';
                      if (_selectedStockItemId != null) {
                        final item = state.items.firstWhere((i) => i.id == _selectedStockItemId);
                        if (qty > item.currentStock) return 'Stok tidak mencukupi';
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: _reasonController,
                    decoration: const InputDecoration(labelText: 'Alasan'),
                    maxLines: 2,
                    validator: (value) => value == null || value.isEmpty ? 'Masukkan alasan' : null,
                  ),
                ],
              ),
            ),
          );
        },
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Batal'),
        ),
        ElevatedButton(
          onPressed: _submitStockOut,
          child: const Text('Simpan'),
        ),
      ],
    );
  }

  Future<void> _submitStockOut() async {
    if (!_formKey.currentState!.validate() || _selectedStockItemId == null) return;

    final state = context.read<StockBloc>().state;
    if (state is! StockLoaded) return;

    final selectedItem = state.items.firstWhere((item) => item.id == _selectedStockItemId);
    final quantity = double.parse(_quantityController.text);
    final employeeId = await AuthHelper.getCurrentEmployeeId();
    final employeeName = await AuthHelper.getCurrentEmployeeName();

    final movement = StockMovementEntity(
      id: const Uuid().v4(),
      stockItemId: selectedItem.id,
      stockItemName: selectedItem.name,
      movementType: 'out',
      quantity: quantity,
      unit: selectedItem.unit,
      previousStock: selectedItem.currentStock,
      newStock: selectedItem.currentStock - quantity,
      reason: _reasonController.text,
      employeeId: employeeId,
      employeeName: employeeName,
      createdAt: DateTime.now(),
    );

    context.read<StockBloc>().add(CreateStockMovement(movement));
    Navigator.pop(context);
  }

  @override
  void dispose() {
    _quantityController.dispose();
    _reasonController.dispose();
    super.dispose();
  }
}
