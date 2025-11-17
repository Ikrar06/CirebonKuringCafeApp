import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../bloc/pelayan_bloc.dart';
import '../bloc/pelayan_event.dart';
import '../bloc/pelayan_state.dart';
import '../widgets/ready_orders_panel.dart';
import '../widgets/tables_panel.dart';

class PelayanDashboard extends StatefulWidget {
  const PelayanDashboard({super.key});

  @override
  State<PelayanDashboard> createState() => _PelayanDashboardState();
}

class _PelayanDashboardState extends State<PelayanDashboard> {
  @override
  void initState() {
    super.initState();
    context.read<PelayanBloc>().add(WatchTables());
    context.read<PelayanBloc>().add(WatchReadyOrders());
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Pelayan'),
      ),
      body: BlocConsumer<PelayanBloc, PelayanState>(
        listener: (context, state) {
          if (state is PelayanError) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text(state.message), backgroundColor: Colors.red),
            );
          } else if (state is PelayanOperationSuccess) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text(state.message), backgroundColor: Colors.green),
            );
          }
        },
        builder: (context, state) {
          if (state is PelayanLoading) {
            return const Center(child: CircularProgressIndicator());
          }

          if (state is PelayanLoaded) {
            return Row(
              children: [
                Expanded(
                  flex: 2,
                  child: TablesPanel(tables: state.tables),
                ),
                const VerticalDivider(width: 1),
                Expanded(
                  flex: 1,
                  child: ReadyOrdersPanel(readyOrders: state.readyOrders),
                ),
              ],
            );
          }

          return const Center(child: Text('Tidak ada data'));
        },
      ),
    );
  }
}
