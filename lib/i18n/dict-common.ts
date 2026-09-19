/**
 * Cross-area UI strings (auth pages, shells, shared bits).
 * English is the source of truth; zh must satisfy the same shape.
 */
import {
  UserStatus,
  RoleStatus,
  TokenStatus,
  OrderStatus,
  SubscriptionStatus,
  UsageStatus,
  LedgerType,
  PermissionType,
  Provider,
  Protocol,
  PROVIDER_LABELS,
  PROTOCOL_LABELS,
} from '@/lib/db/enums';

export const commonEn = {
  brand: 'Nebula API',
  nav: {
    pricing: 'Pricing',
    docs: 'Docs',
    signIn: 'Sign in',
    signOut: 'Sign out',
    getStarted: 'Get started',
    dashboard: 'Dashboard',
    admin: 'Admin',
  },
  misc: {
    loading: 'Loading…',
    language: 'Language',
    email: 'Email',
    operationSucceeded: 'Operation succeeded',
    password: 'Password',
    name: 'Name',
    balance: 'Balance',
    status: 'Status',
    active: 'active',
    suspended: 'suspended',
    createdAt: 'Created',
    actions: 'Actions',
  },
  /** Numeric-enum display labels (keys are smallint codes). */
  enums: {
    userStatus: {
      [UserStatus.Active]: 'Active',
      [UserStatus.Suspended]: 'Suspended',
    },
    roleStatus: {
      [RoleStatus.Active]: 'Active',
      [RoleStatus.Disabled]: 'Disabled',
    },
    tokenStatus: {
      [TokenStatus.Active]: 'Active',
      [TokenStatus.Revoked]: 'Revoked',
    },
    orderStatus: {
      [OrderStatus.Pending]: 'Pending',
      [OrderStatus.Paid]: 'Paid',
      [OrderStatus.Canceled]: 'Canceled',
      [OrderStatus.Refunded]: 'Refunded',
    },
    subscriptionStatus: {
      [SubscriptionStatus.Active]: 'Active',
      [SubscriptionStatus.Expired]: 'Expired',
    },
    usageStatus: {
      [UsageStatus.Success]: 'Success',
      [UsageStatus.Blocked]: 'Blocked',
      [UsageStatus.UpstreamError]: 'Upstream error',
    },
    ledgerType: {
      [LedgerType.Purchase]: 'Purchase',
      [LedgerType.Usage]: 'Usage',
      [LedgerType.Refund]: 'Refund',
      [LedgerType.Adjustment]: 'Adjustment',
      [LedgerType.Expiry]: 'Expiry',
      [LedgerType.Campaign]: 'Campaign',
    },
    permissionType: {
      [PermissionType.Menu]: 'Menu',
      [PermissionType.Action]: 'Action',
    },
    provider: PROVIDER_LABELS,
    protocol: PROTOCOL_LABELS,
  },
  checkout: {
    title: 'Checkout',
    subtitle: 'Complete your payment',
    orderNo: 'Order No.',
    package: 'Package',
    amount: 'Amount',
    credit: 'Credit',
    pay: 'Pay now',
    paying: 'Processing…',
    cancel: 'Cancel',
    success: 'Payment successful — redirecting…',
    notFound: 'Order not found.',
    sandboxNotice: 'Sandbox mode — no real charge. Click "Pay now" to simulate a successful payment.',
    alreadyPaid: 'This order is already paid.',
  },
};

export const commonZh = {
  brand: 'Nebula API',
  nav: {
    pricing: '定价',
    docs: '文档',
    signIn: '登录',
    signOut: '退出登录',
    getStarted: '立即开始',
    dashboard: '控制台',
    admin: '管理后台',
  },
  misc: {
    loading: '加载中…',
    language: '语言',
    email: '邮箱',
    operationSucceeded: '操作成功',
    password: '密码',
    name: '姓名',
    balance: '余额',
    status: '状态',
    active: '正常',
    suspended: '已停用',
    createdAt: '创建时间',
    actions: '操作',
  },
  enums: {
    userStatus: {
      [UserStatus.Active]: '正常',
      [UserStatus.Suspended]: '已停用',
    },
    roleStatus: {
      [RoleStatus.Active]: '正常',
      [RoleStatus.Disabled]: '已禁用',
    },
    tokenStatus: {
      [TokenStatus.Active]: '正常',
      [TokenStatus.Revoked]: '已吊销',
    },
    orderStatus: {
      [OrderStatus.Pending]: '待支付',
      [OrderStatus.Paid]: '已支付',
      [OrderStatus.Canceled]: '已取消',
      [OrderStatus.Refunded]: '已退款',
    },
    subscriptionStatus: {
      [SubscriptionStatus.Active]: '有效',
      [SubscriptionStatus.Expired]: '已过期',
    },
    usageStatus: {
      [UsageStatus.Success]: '成功',
      [UsageStatus.Blocked]: '已拦截',
      [UsageStatus.UpstreamError]: '上游错误',
    },
    ledgerType: {
      [LedgerType.Purchase]: '充值',
      [LedgerType.Usage]: '消费',
      [LedgerType.Refund]: '退款',
      [LedgerType.Adjustment]: '调整',
      [LedgerType.Expiry]: '过期',
      [LedgerType.Campaign]: '营销奖励',
    },
    permissionType: {
      [PermissionType.Menu]: '菜单',
      [PermissionType.Action]: '操作',
    },
    provider: PROVIDER_LABELS,
    protocol: PROTOCOL_LABELS,
  },
  checkout: {
    title: '收银台',
    subtitle: '完成支付',
    orderNo: '订单号',
    package: '套餐',
    amount: '金额',
    credit: '到账额度',
    pay: '立即支付',
    paying: '处理中…',
    cancel: '取消',
    success: '支付成功，正在跳转…',
    notFound: '订单不存在。',
    sandboxNotice: '沙盒模式——不会真实扣款。点击「立即支付」模拟支付成功。',
    alreadyPaid: '该订单已支付。',
  },
} satisfies typeof commonEn;
