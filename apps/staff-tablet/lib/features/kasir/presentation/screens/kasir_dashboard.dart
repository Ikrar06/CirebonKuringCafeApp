import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:intl/intl.dart';

import '../bloc/kasir_bloc.dart';
import '../bloc/kasir_event.dart';
import '../bloc/kasir_state.dart';
import '../widgets/order_payment_card.dart';
import 'payment_verification.dart';
import 'cash_reconciliation.dart';

class KasirDashboard extends StatefulWidget {
  const KasirDashboard({super.key});

  @override
  State<KasirDashboard> createState() => _KasirDashboardState();
}

class _KasirDashboardState extends State<KasirDashboard> {
  final currencyFormatter = NumberFormat.currency(locale: 'id_ID', symbol: 'Rp ', decimalDigits: 0);

  @override
  void initState() {
    super.initState();
    context.read<KasirBloc>().add(WatchOrders());
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Kasir Dashboard'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () {
              context.read<KasirBloc>().add(WatchOrders());
            },
            tooltip: 'Refresh',
          ),
        ],
      ),
      body: BlocConsumer<KasirBloc, KasirState>(
        listener: (context, state) {
          if (state is KasirError) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text(state.message), backgroundColor: Colors.red),
            );
          } else if (state is KasirOperationSuccess) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text(state.message), backgroundColor: Colors.green),
            );
          }
        },
        builder: (context, state) {
          if (state is KasirLoading || state is KasirInitial) {
            return const Center(child: CircularProgressIndicator());
          }

          if (state is KasirLoaded) {
            return _buildDashboard(context, state);
          }

          return const Center(child: Text('Tidak ada data'));
        },
      ),
    );
  }

  Widget _buildDashboard(BuildContext context, KasirLoaded state) {
    final orders = state.orders;
    final pendingPayments = state.pendingPayments;
    final kasirBloc = context.read<KasirBloc>();

    // Calculate stats
    final completedToday = orders.where((o) => o.order.status == 'completed').length;
    final totalRevenue = orders
        .where((o) => o.order.status == 'completed')
        .fold<double>(0, (sum, o) => sum + o.totalAmount);
    final preparing = orders.where((o) => o.order.status == 'preparing').length;
    final ready = orders.where((o) => o.order.status == 'ready').length;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Quick Stats
          _buildQuickStats(
            totalOrders: orders.length,
            pendingPayments: pendingPayments.length,
            completedToday: completedToday,
            totalRevenue: totalRevenue,
          ),
          const SizedBox(height: 24),

          // Quick Actions
          _buildQuickActions(context, pendingPayments.length),
          const SizedBox(height: 24),

          // Active Orders Summary
          if (preparing > 0 || ready > 0 || pendingPayments.isNotEmpty) ...[
            _buildActiveOrdersSummary(preparing, ready, pendingPayments.length),
            const SizedBox(height: 24),
          ],

          // Pending Payments Section
          if (pendingPayments.isNotEmpty) ...[
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Pembayaran Menunggu Verifikasi',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                TextButton(
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (context) => BlocProvider.value(
                          value: context.read<KasirBloc>(),
                          child: const PaymentVerificationScreen(),
                        ),
                      ),
                    );
                  },
                  child: const Text('Lihat Semua'),
                ),
              ],
            ),
            const SizedBox(height: 8),
            ...pendingPayments.take(3).map((order) => OrderPaymentCard(orderWithPayment: order)),
          ] else ...[
            const SizedBox(height: 16),
            Center(
              child: Column(
                children: [
                  Icon(Icons.check_circle_outline, size: 64, color: Colors.grey[400]),
                  const SizedBox(height: 16),
                  Text(
                    'Semua pembayaran sudah diverifikasi',
                    style: TextStyle(fontSize: 16, color: Colors.grey[600]),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildQuickStats({
    required int totalOrders,
    required int pendingPayments,
    required int completedToday,
    required double totalRevenue,
  }) {
    return Row(
      children: [
        Expanded(
          child: _buildStatCard(
            icon: Icons.receipt_long,
            label: 'Total Pesanan',
            value: totalOrders.toString(),
            color: Colors.blue,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _buildStatCard(
            icon: Icons.pending_actions,
            label: 'Pending Bayar',
            value: pendingPayments.toString(),
            color: Colors.orange,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _buildStatCard(
            icon: Icons.check_circle,
            label: 'Selesai Hari Ini',
            value: completedToday.toString(),
            color: Colors.green,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _buildStatCard(
            icon: Icons.attach_money,
            label: 'Pendapatan',
            value: currencyFormatter.format(totalRevenue),
            color: Colors.purple,
            isCompact: true,
          ),
        ),
      ],
    );
  }

  Widget _buildStatCard({
    required IconData icon,
    required String label,
    required String value,
    required Color color,
    bool isCompact = false,
  }) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, color: color, size: 32),
            const SizedBox(height: 8),
            Text(
              label,
              style: const TextStyle(fontSize: 12, color: Colors.grey),
            ),
            const SizedBox(height: 4),
            Text(
              value,
              style: TextStyle(
                fontSize: isCompact ? 14 : 20,
                fontWeight: FontWeight.bold,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildQuickActions(BuildContext context, int pendingCount) {
    final kasirBloc = context.read<KasirBloc>();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Menu Utama',
          style: Theme.of(context).textTheme.titleLarge,
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: _buildActionButton(
                context,
                icon: Icons.payment,
                label: 'Verifikasi\nPembayaran',
                badge: pendingCount > 0 ? pendingCount.toString() : null,
                color: Colors.blue,
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => BlocProvider.value(
                        value: kasirBloc,
                        child: const PaymentVerificationScreen(),
                      ),
                    ),
                  );
                },
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _buildActionButton(
                context,
                icon: Icons.list_alt,
                label: 'Live\nOrders',
                color: Colors.green,
                onTap: () {
                  // Navigate to live orders
                },
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _buildActionButton(
                context,
                icon: Icons.account_balance_wallet,
                label: 'Rekap\nKas',
                color: Colors.orange,
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => const CashReconciliationScreen(),
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildActionButton(
    BuildContext context, {
    required IconData icon,
    required String label,
    required Color color,
    required VoidCallback onTap,
    String? badge,
  }) {
    return Card(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            children: [
              Stack(
                clipBehavior: Clip.none,
                children: [
                  Icon(icon, size: 40, color: color),
                  if (badge != null)
                    Positioned(
                      right: -8,
                      top: -8,
                      child: Container(
                        padding: const EdgeInsets.all(4),
                        decoration: const BoxDecoration(
                          color: Colors.red,
                          shape: BoxShape.circle,
                        ),
                        constraints: const BoxConstraints(
                          minWidth: 20,
                          minHeight: 20,
                        ),
                        child: Text(
                          badge,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                          ),
                          textAlign: TextAlign.center,
                        ),
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 12),
              Text(
                label,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildActiveOrdersSummary(int preparing, int ready, int pending) {
    return Card(
      color: Colors.blue[50],
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Pesanan Aktif',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _buildOrderStatusChip('Sedang Dimasak', preparing, Colors.orange),
                _buildOrderStatusChip('Siap Disajikan', ready, Colors.green),
                _buildOrderStatusChip('Pending Bayar', pending, Colors.red),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildOrderStatusChip(String label, int count, Color color) {
    return Column(
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          decoration: BoxDecoration(
            color: color,
            borderRadius: BorderRadius.circular(20),
          ),
          child: Text(
            count.toString(),
            style: const TextStyle(
              color: Colors.white,
              fontSize: 20,
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
        const SizedBox(height: 4),
        Text(
          label,
          style: const TextStyle(fontSize: 12),
          textAlign: TextAlign.center,
        ),
      ],
    );
  }
}
