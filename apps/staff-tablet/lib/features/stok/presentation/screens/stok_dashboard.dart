import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../bloc/stock_bloc.dart';
import '../bloc/stock_event.dart';
import '../bloc/stock_state.dart';
import '../dialogs/stock_in_dialog.dart';
import '../dialogs/stock_out_dialog.dart';
import '../widgets/stock_item_card.dart';
import '../widgets/low_stock_alert.dart';

class StokDashboard extends StatefulWidget {
  const StokDashboard({super.key});

  @override
  State<StokDashboard> createState() => _StokDashboardState();
}

class _StokDashboardState extends State<StokDashboard> {
  @override
  void initState() {
    super.initState();
    context.read<StockBloc>().add(WatchStockItems());
    context.read<StockBloc>().add(LoadSuppliers());
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Manajemen Stok'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add_box),
            onPressed: () => _showStockInDialog(),
            tooltip: 'Stok Masuk',
          ),
          IconButton(
            icon: const Icon(Icons.remove_circle),
            onPressed: () => _showStockOutDialog(),
            tooltip: 'Stok Keluar',
          ),
        ],
      ),
      body: BlocConsumer<StockBloc, StockState>(
        listener: (context, state) {
          if (state is StockError) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text(state.message), backgroundColor: Colors.red),
            );
          } else if (state is StockOperationSuccess) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text(state.message), backgroundColor: Colors.green),
            );
          }
        },
        builder: (context, state) {
          if (state is StockLoading) {
            return const Center(child: CircularProgressIndicator());
          }

          if (state is StockLoaded) {
            return Column(
              children: [
                if (state.lowStockItems.isNotEmpty)
                  LowStockAlert(lowStockItems: state.lowStockItems),
                Expanded(
                  child: ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: state.items.length,
                    itemBuilder: (context, index) {
                      return StockItemCard(item: state.items[index]);
                    },
                  ),
                ),
              ],
            );
          }

          return const Center(child: Text('Tidak ada data stok'));
        },
      ),
    );
  }

  void _showStockInDialog() {
    showDialog(
      context: context,
      builder: (context) => const StockInDialog(),
    );
  }

  void _showStockOutDialog() {
    showDialog(
      context: context,
      builder: (context) => const StockOutDialog(),
    );
  }
}
