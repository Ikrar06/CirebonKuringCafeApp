import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:uuid/uuid.dart';

import '../../../../core/utils/auth_helper.dart';
import '../../domain/entities/stock_movement_entity.dart';
import '../bloc/stock_bloc.dart';
import '../bloc/stock_event.dart';
import '../bloc/stock_state.dart';

class StockInDialog extends StatefulWidget {
  const StockInDialog({super.key});

  @override
  State<StockInDialog> createState() => _StockInDialogState();
}

class _StockInDialogState extends State<StockInDialog> {
  final _formKey = GlobalKey<FormState>();
  final _quantityController = TextEditingController();
  final _notesController = TextEditingController();
  String? _selectedStockItemId;
  String? _selectedSupplierId;

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Stok Masuk'),
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
                        child: Text(item.name),
                      );
                    }).toList(),
                    onChanged: (value) => setState(() => _selectedStockItemId = value),
                    validator: (value) => value == null ? 'Pilih item stok' : null,
                  ),
                  const SizedBox(height: 16),
                  DropdownButtonFormField<String>(
                    initialValue: _selectedSupplierId,
                    decoration: const InputDecoration(labelText: 'Supplier'),
                    items: state.suppliers.map((supplier) {
                      return DropdownMenuItem(
                        value: supplier.id,
                        child: Text(supplier.name),
                      );
                    }).toList(),
                    onChanged: (value) => setState(() => _selectedSupplierId = value),
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: _quantityController,
                    decoration: const InputDecoration(labelText: 'Jumlah'),
                    keyboardType: TextInputType.number,
                    validator: (value) {
                      if (value == null || value.isEmpty) return 'Masukkan jumlah';
                      if (double.tryParse(value) == null) return 'Jumlah tidak valid';
                      return null;
                    },
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: _notesController,
                    decoration: const InputDecoration(labelText: 'Catatan (opsional)'),
                    maxLines: 2,
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
          onPressed: _submitStockIn,
          child: const Text('Simpan'),
        ),
      ],
    );
  }

  Future<void> _submitStockIn() async {
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
      movementType: 'in',
      quantity: quantity,
      unit: selectedItem.unit,
      previousStock: selectedItem.currentStock,
      newStock: selectedItem.currentStock + quantity,
      supplierId: _selectedSupplierId,
      supplierName: _selectedSupplierId != null
          ? state.suppliers.firstWhere((s) => s.id == _selectedSupplierId).name
          : null,
      notes: _notesController.text.isNotEmpty ? _notesController.text : null,
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
    _notesController.dispose();
    super.dispose();
  }
}
