import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_strings.dart';
import '../../../../core/widgets/loading_indicator.dart';
import '../bloc/auth_bloc.dart';
import '../bloc/auth_event.dart';
import '../bloc/auth_state.dart';

class EmployeeLoginPage extends StatefulWidget {
  const EmployeeLoginPage({super.key});

  @override
  State<EmployeeLoginPage> createState() => _EmployeeLoginPageState();
}

class _EmployeeLoginPageState extends State<EmployeeLoginPage> {
  String _pin = '';
  final int _pinLength = 4;

  void _onNumberTap(String number) {
    if (_pin.length < _pinLength) {
      setState(() {
        _pin += number;
      });

      // Auto-submit when PIN is complete
      if (_pin.length == _pinLength) {
        _handleLogin();
      }
    }
  }

  void _onDeleteTap() {
    if (_pin.isNotEmpty) {
      setState(() {
        _pin = _pin.substring(0, _pin.length - 1);
      });
    }
  }

  void _onClearTap() {
    setState(() {
      _pin = '';
    });
  }

  void _handleLogin() {
    if (_pin.length != _pinLength) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('PIN harus 4 digit'),
          backgroundColor: AppColors.colorError,
          duration: Duration(seconds: 2),
        ),
      );
      return;
    }

    context.read<AuthBloc>().add(EmployeeLoginEvent(pin: _pin));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.colorGray50,
      appBar: AppBar(
        title: const Text(AppStrings.employeeLogin),
        backgroundColor: AppColors.primaryBlue,
        foregroundColor: AppColors.colorWhite,
      ),
      body: BlocConsumer<AuthBloc, AuthState>(
        listener: (context, state) {
          if (state is AuthError) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(state.message),
                backgroundColor: AppColors.colorError,
              ),
            );
            // Clear PIN on error
            setState(() {
              _pin = '';
            });
          } else if (state is EmployeeAuthenticated) {
            Navigator.pushReplacementNamed(
              context,
              state.auth.device.type.routeName,
            );
          }
        },
        builder: (context, state) {
          if (state is AuthLoading) {
            return const LoadingIndicator(
              message: 'Memverifikasi PIN...',
            );
          }

          return Center(
            child: Container(
              constraints: const BoxConstraints(maxWidth: 600),
              padding: const EdgeInsets.all(48),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Text(
                    'Masukkan PIN Karyawan',
                    style: TextStyle(
                      fontSize: 32,
                      fontWeight: FontWeight.bold,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 48),
                  // PIN Display
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: List.generate(
                      _pinLength,
                      (index) => Container(
                        width: 72,
                        height: 72,
                        margin: const EdgeInsets.symmetric(horizontal: 8),
                        decoration: BoxDecoration(
                          color: AppColors.colorWhite,
                          border: Border.all(
                            color: index < _pin.length
                                ? AppColors.primaryBlue
                                : AppColors.colorGray200,
                            width: 2,
                          ),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Center(
                          child: index < _pin.length
                              ? const Icon(
                                  Icons.circle,
                                  size: 24,
                                  color: AppColors.primaryBlue,
                                )
                              : null,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 48),
                  // Number Pad
                  _buildNumberPad(),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildNumberPad() {
    return Container(
      constraints: const BoxConstraints(maxWidth: 400),
      child: Column(
        children: [
          // Row 1-3
          _buildNumberRow(['1', '2', '3']),
          const SizedBox(height: 16),
          _buildNumberRow(['4', '5', '6']),
          const SizedBox(height: 16),
          _buildNumberRow(['7', '8', '9']),
          const SizedBox(height: 16),
          // Row 4 (Clear, 0, Delete)
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [
              _buildActionButton(
                label: 'Clear',
                icon: Icons.clear_all,
                onTap: _onClearTap,
              ),
              _buildNumberButton('0'),
              _buildActionButton(
                label: 'Del',
                icon: Icons.backspace_outlined,
                onTap: _onDeleteTap,
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildNumberRow(List<String> numbers) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
      children: numbers.map((number) => _buildNumberButton(number)).toList(),
    );
  }

  Widget _buildNumberButton(String number) {
    return Expanded(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 8),
        child: ElevatedButton(
          onPressed: () => _onNumberTap(number),
          style: ElevatedButton.styleFrom(
            padding: const EdgeInsets.all(24),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
            backgroundColor: AppColors.colorWhite,
            foregroundColor: AppColors.colorGray900,
          ),
          child: Text(
            number,
            style: const TextStyle(
              fontSize: 28,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildActionButton({
    required String label,
    required IconData icon,
    required VoidCallback onTap,
  }) {
    return Expanded(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 8),
        child: ElevatedButton(
          onPressed: onTap,
          style: ElevatedButton.styleFrom(
            padding: const EdgeInsets.all(24),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
            backgroundColor: AppColors.colorGray100,
            foregroundColor: AppColors.colorGray600,
          ),
          child: Icon(icon, size: 28),
        ),
      ),
    );
  }
}
