import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:intl/intl.dart';

import '../bloc/kasir_bloc.dart';
import '../bloc/kasir_event.dart';
import '../bloc/kasir_state.dart';
import '../../domain/entities/order_with_payment_entity.dart';

class LiveOrdersScreen extends StatefulWidget {
  const LiveOrdersScreen({super.key});

  @override
  State<LiveOrdersScreen> createState() => _LiveOrdersScreenState();
}

class _LiveOrdersScreenState extends State<LiveOrdersScreen> {
  final currencyFormatter = NumberFormat.currency(locale: 'id_ID', symbol: 'Rp ', decimalDigits: 0);
  DateTime _lastUpdate = DateTime.now();
  bool _autoRefresh = true;

  @override
  void initState() {
    super.initState();
    context.read<KasirBloc>().add(WatchOrders());
  }

  String _formatLastUpdate() {
    final difference = DateTime.now().difference(_lastUpdate);
    if (difference.inSeconds < 60) {
      return '${difference.inSeconds}s ago';
    }
    return '${difference.inMinutes}m ago';
  }

  void _handleRefresh() {
    setState(() {
      _lastUpdate = DateTime.now();
    });
    context.read<KasirBloc>().add(WatchOrders());
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Live Orders & Kitchen'),
        actions: [
          // Auto-refresh toggle
          Row(
            children: [
              Checkbox(
                value: _autoRefresh,
                onChanged: (value) {
                  setState(() {
                    _autoRefresh = value ?? true;
                  });
                },
              ),
              const Text('Auto'),
            ],
          ),
          const SizedBox(width: 8),
          // Last update time
          Padding(
            padding: const EdgeInsets.only(right: 8),
            child: Center(
              child: Text(
                'Updated ${_formatLastUpdate()}',
                style: const TextStyle(fontSize: 12),
              ),
            ),
          ),
          // Refresh button
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _handleRefresh,
            tooltip: 'Refresh',
          ),
        ],
      ),
      body: BlocBuilder<KasirBloc, KasirState>(
        builder: (context, state) {
          if (state is KasirLoading || state is KasirInitial) {
            return const Center(child: CircularProgressIndicator());
          }

          if (state is KasirError) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.error_outline, size: 64, color: Colors.red),
                  const SizedBox(height: 16),
                  Text(
                    'Failed to Load Orders',
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    state.message,
                    style: const TextStyle(color: Colors.red),
                  ),
                  const SizedBox(height: 24),
                  ElevatedButton(
                    onPressed: _handleRefresh,
                    child: const Text('Try Again'),
                  ),
                ],
              ),
            );
          }

          if (state is KasirLoaded) {
            final orders = state.orders;

            // Group orders by status
            final pending = orders.where((o) => o.order.status == 'pending_payment').toList();
            final confirmed = orders.where((o) => o.order.status == 'confirmed').toList();
            final preparing = orders.where((o) => o.order.status == 'preparing').toList();
            final ready = orders.where((o) => o.order.status == 'ready').toList();
            final delivered = orders.where((o) => o.order.status == 'delivered').toList();

            // Calculate metrics
            final activeOrders = confirmed.length + preparing.length + ready.length;
            final itemsInQueue = preparing.fold<int>(0, (sum, o) => sum + o.order.items.length);

            return orders.isEmpty
                ? _buildEmptyState()
                : SingleChildScrollView(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Kitchen Metrics
                        _buildKitchenMetrics(
                          activeOrders: activeOrders,
                          itemsInQueue: itemsInQueue,
                          preparing: preparing.length,
                          ready: ready.length,
                        ),
                        const SizedBox(height: 24),

                        // Orders by Status
                        if (pending.isNotEmpty) ...[
                          _buildSectionHeader('Pending Orders', pending.length),
                          const SizedBox(height: 12),
                          ...pending.map((order) => _buildOrderCard(order)),
                          const SizedBox(height: 24),
                        ],

                        if (confirmed.isNotEmpty) ...[
                          _buildSectionHeader('Confirmed Orders', confirmed.length),
                          const SizedBox(height: 12),
                          ...confirmed.map((order) => _buildOrderCard(order)),
                          const SizedBox(height: 24),
                        ],

                        if (preparing.isNotEmpty) ...[
                          _buildSectionHeader('Preparing Orders', preparing.length),
                          const SizedBox(height: 12),
                          ...preparing.map((order) => _buildOrderCard(order)),
                          const SizedBox(height: 24),
                        ],

                        if (ready.isNotEmpty) ...[
                          _buildSectionHeader('Ready Orders', ready.length),
                          const SizedBox(height: 12),
                          ...ready.map((order) => _buildOrderCard(order)),
                          const SizedBox(height: 24),
                        ],

                        if (delivered.isNotEmpty) ...[
                          _buildSectionHeader('Delivered Orders', delivered.length),
                          const SizedBox(height: 12),
                          ...delivered.map((order) => _buildOrderCard(order)),
                          const SizedBox(height: 24),
                        ],
                      ],
                    ),
                  );
          }

          return const Center(child: Text('Tidak ada data'));
        },
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.restaurant_menu, size: 64, color: Colors.grey),
          const SizedBox(height: 16),
          const Text(
            'No Active Orders',
            style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          const Text(
            'All orders have been completed.\nNew orders will appear here automatically.',
            textAlign: TextAlign.center,
            style: TextStyle(color: Colors.grey),
          ),
          const SizedBox(height: 24),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 8,
                height: 8,
                decoration: const BoxDecoration(
                  color: Colors.green,
                  shape: BoxShape.circle,
                ),
              ),
              const SizedBox(width: 8),
              const Text(
                'Waiting for new orders...',
                style: TextStyle(color: Colors.grey, fontSize: 14),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildKitchenMetrics({
    required int activeOrders,
    required int itemsInQueue,
    required int preparing,
    required int ready,
  }) {
    return Row(
      children: [
        Expanded(
          child: _buildMetricCard(
            icon: Icons.restaurant,
            label: 'Active Orders',
            value: activeOrders.toString(),
            color: activeOrders > 5 ? Colors.red : Colors.blue,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _buildMetricCard(
            icon: Icons.list_alt,
            label: 'Items in Queue',
            value: itemsInQueue.toString(),
            color: Colors.orange,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _buildMetricCard(
            icon: Icons.soup_kitchen,
            label: 'Preparing',
            value: preparing.toString(),
            color: Colors.purple,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _buildMetricCard(
            icon: Icons.check_circle,
            label: 'Ready',
            value: ready.toString(),
            color: Colors.green,
          ),
        ),
      ],
    );
  }

  Widget _buildMetricCard({
    required IconData icon,
    required String label,
    required String value,
    required Color color,
  }) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Icon(icon, color: color, size: 32),
            const SizedBox(height: 8),
            Text(
              label,
              style: const TextStyle(fontSize: 12, color: Colors.grey),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 4),
            Text(
              value,
              style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionHeader(String title, int count) {
    return Row(
      children: [
        Text(
          '$title ($count)',
          style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
        ),
      ],
    );
  }

  Widget _buildOrderCard(OrderWithPaymentEntity orderWithPayment) {
    final order = orderWithPayment.order;
    final statusColor = _getStatusColor(order.status);
    final statusLabel = _getStatusLabel(order.status);

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: Colors.blue,
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        order.orderNumber,
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: statusColor.withOpacity(0.2),
                        borderRadius: BorderRadius.circular(4),
                        border: Border.all(color: statusColor),
                      ),
                      child: Text(
                        statusLabel,
                        style: TextStyle(
                          color: statusColor,
                          fontWeight: FontWeight.w500,
                          fontSize: 12,
                        ),
                      ),
                    ),
                  ],
                ),
                Text(
                  currencyFormatter.format(orderWithPayment.totalAmount),
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // Table Info
            Row(
              children: [
                const Icon(Icons.table_restaurant, size: 16, color: Colors.grey),
                const SizedBox(width: 8),
                Text(
                  order.tableNumber,
                  style: const TextStyle(fontSize: 14),
                ),
                const SizedBox(width: 16),
                const Icon(Icons.access_time, size: 16, color: Colors.grey),
                const SizedBox(width: 8),
                Text(
                  DateFormat('HH:mm').format(order.createdAt),
                  style: const TextStyle(fontSize: 14),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // Order Items
            ...order.items.map((item) => Padding(
                  padding: const EdgeInsets.only(bottom: 4),
                  child: Row(
                    children: [
                      Text(
                        '${item.quantity}x',
                        style: const TextStyle(fontWeight: FontWeight.w500),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(item.itemName),
                      ),
                      Text(
                        currencyFormatter.format(item.subtotal),
                        style: const TextStyle(fontWeight: FontWeight.w500),
                      ),
                    ],
                  ),
                )),
          ],
        ),
      ),
    );
  }

  Color _getStatusColor(String status) {
    switch (status) {
      case 'pending_payment':
        return Colors.yellow[700]!;
      case 'confirmed':
        return Colors.blue;
      case 'preparing':
        return Colors.orange;
      case 'ready':
        return Colors.green;
      case 'delivered':
        return Colors.purple;
      case 'completed':
        return Colors.grey;
      default:
        return Colors.grey;
    }
  }

  String _getStatusLabel(String status) {
    switch (status) {
      case 'pending_payment':
        return 'Pending Payment';
      case 'confirmed':
        return 'Confirmed';
      case 'preparing':
        return 'Preparing';
      case 'ready':
        return 'Ready';
      case 'delivered':
        return 'Delivered';
      case 'completed':
        return 'Completed';
      default:
        return status;
    }
  }
}
