import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/constants/app_colors.dart';
import '../../../../core/widgets/empty_state_widget.dart';
import '../../../../core/widgets/error_widget.dart';
import '../../../../core/widgets/loading_indicator.dart';
import '../bloc/kitchen_bloc.dart';
import '../bloc/kitchen_event.dart';
import '../bloc/kitchen_state.dart';
import '../widgets/order_card.dart';

class KitchenDisplayPage extends StatefulWidget {
  const KitchenDisplayPage({super.key});

  @override
  State<KitchenDisplayPage> createState() => _KitchenDisplayPageState();
}

class _KitchenDisplayPageState extends State<KitchenDisplayPage> {
  @override
  void initState() {
    super.initState();
    // Load orders on init
    context.read<KitchenBloc>().add(const LoadActiveOrdersEvent());
    // Start watching for real-time updates
    context.read<KitchenBloc>().add(const WatchOrdersEvent());
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.colorGray50,
      appBar: AppBar(
        title: Row(
          children: [
            const Icon(Icons.restaurant_menu, size: 28),
            const SizedBox(width: 12),
            const Text('Kitchen Display'),
            const Spacer(),
            BlocBuilder<KitchenBloc, KitchenState>(
              builder: (context, state) {
                if (state is KitchenLoaded) {
                  final activeCount = state.orders.length;
                  return Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 8,
                    ),
                    decoration: BoxDecoration(
                      color: AppColors.colorWhite.withValues(alpha: 0.2),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.receipt_long, size: 20),
                        const SizedBox(width: 8),
                        Text(
                          '$activeCount Active',
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                  );
                }
                return const SizedBox.shrink();
              },
            ),
            const SizedBox(width: 16),
            IconButton(
              icon: const Icon(Icons.refresh, size: 28),
              onPressed: () {
                context
                    .read<KitchenBloc>()
                    .add(const LoadActiveOrdersEvent());
              },
              tooltip: 'Refresh',
            ),
          ],
        ),
      ),
      body: BlocConsumer<KitchenBloc, KitchenState>(
        listener: (context, state) {
          if (state is KitchenError) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(state.message),
                backgroundColor: AppColors.colorError,
                action: SnackBarAction(
                  label: 'Retry',
                  textColor: AppColors.colorWhite,
                  onPressed: () {
                    context
                        .read<KitchenBloc>()
                        .add(const LoadActiveOrdersEvent());
                  },
                ),
              ),
            );
          }
        },
        builder: (context, state) {
          if (state is KitchenLoading) {
            return const LoadingIndicator(
              message: 'Loading orders...',
            );
          }

          if (state is KitchenError && state.orders == null) {
            return AppErrorWidget(
              message: state.message,
              onRetry: () {
                context
                    .read<KitchenBloc>()
                    .add(const LoadActiveOrdersEvent());
              },
            );
          }

          if (state is KitchenLoaded) {
            if (state.orders.isEmpty) {
              return const EmptyStateWidget(
                message: 'No Active Orders',
                description: 'All orders have been completed',
                icon: Icons.check_circle_outline,
              );
            }

            return _buildOrdersGrid(state);
          }

          return const SizedBox.shrink();
        },
      ),
    );
  }

  Widget _buildOrdersGrid(KitchenLoaded state) {
    final sortedOrders = state.getSortedOrders();

    return GridView.builder(
      padding: const EdgeInsets.all(16),
      gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
        maxCrossAxisExtent: 400,
        childAspectRatio: 0.75,
        crossAxisSpacing: 16,
        mainAxisSpacing: 16,
      ),
      itemCount: sortedOrders.length,
      itemBuilder: (context, index) {
        final order = sortedOrders[index];

        return OrderCard(
          order: order,
          onStart: order.status == 'new'
              ? () {
                  context
                      .read<KitchenBloc>()
                      .add(StartOrderEvent(order.id));
                }
              : null,
          onReady: order.status == 'preparing'
              ? () {
                  context
                      .read<KitchenBloc>()
                      .add(MarkOrderReadyEvent(order.id));
                }
              : null,
          onBump: order.status == 'ready'
              ? () {
                  _showBumpConfirmation(context, order.id);
                }
              : null,
        );
      },
    );
  }

  void _showBumpConfirmation(BuildContext context, String orderId) {
    showDialog(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Bump Order?'),
        content: const Text(
          'Are you sure this order has been picked up and should be removed from the display?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(dialogContext);
              context.read<KitchenBloc>().add(BumpOrderEvent(orderId));
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.colorSuccess,
              foregroundColor: AppColors.colorWhite,
            ),
            child: const Text('BUMP'),
          ),
        ],
      ),
    );
  }
}
