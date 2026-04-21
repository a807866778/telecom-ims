export const dynamic = 'force-dynamic';

import { getCurrentUser } from "@/lib/auth";

export default async function ProfilePage() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <div className="text-center py-12 text-gray-400">
        请先登录
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold text-gray-900 mb-6">个人设置</h1>

      <div className="card p-6">
        <div className="space-y-4">
          <div>
            <label className="label">用户名</label>
            <div className="input bg-gray-50">{user.username}</div>
          </div>

          <div>
            <label className="label">姓名</label>
            <div className="input bg-gray-50">{user.realName}</div>
          </div>

          <div>
            <label className="label">您的权限</label>
            <div className="flex flex-wrap gap-2 mt-2">
              {user.permissions.map((perm) => (
                <span key={perm} className="px-3 py-1 bg-gray-100 rounded-full text-sm">
                  {perm}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-100">
          <p className="text-sm text-gray-500">
            如需修改密码或权限，请联系系统管理员。
          </p>
        </div>
      </div>
    </div>
  );
}
