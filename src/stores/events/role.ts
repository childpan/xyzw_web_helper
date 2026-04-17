import type { EVM, XyzwSession } from ".";
import { gameLogger } from "@/utils/logger";
import { useTokenStore } from "../tokenStore";

// 处理加钟/时钟相关事件，触发获取角色信息以更新状态
export const RolePlugin = ({
  onSome,
  $emit
}: EVM) => {

  onSome(["role_getroleinforesp", "role_getroleinfo"], (data: XyzwSession) => {
    gameLogger.verbose(`收到角色信息事件: ${data.tokenId}`, data);
    const { body, tokenId } = data;
    data.gameData.value.roleInfo = body;
    data.gameData.value.lastUpdated = new Date().toISOString();
    if (body.role?.study?.maxCorrectNum !== undefined) {
      $emit.emit("I-study", data);
    }
    
    // 打印资源信息
    gameLogger.info(`=== 资源信息 [${tokenId}] ===`);
    const role = body.role || {};
    gameLogger.info(`基本资源: 金币=${role.gold ?? 0}, 金砖=${role.diamond ?? 0}`);
    
    // 打印物品信息
    const items = role.items || role.itemList || role.bag?.items || role.inventory || null;
    if (items) {
      gameLogger.info("物品列表:");
      if (Array.isArray(items)) {
        items.forEach(item => {
          const id = item.id || item.itemId;
          const quantity = item.num || item.count || item.quantity || 0;
          const name = item.name || `物品${id}`;
          gameLogger.info(`- ${name} (ID: ${id}): ${quantity}`);
        });
      } else if (typeof items === 'object') {
        Object.entries(items).forEach(([key, value]) => {
          let quantity = 0;
          let name = `物品${key}`;
          if (typeof value === 'number') {
            quantity = value;
          } else if (typeof value === 'object') {
            quantity = value.num || value.count || value.quantity || 0;
            name = value.name || name;
          }
          gameLogger.info(`- ${name} (ID: ${key}): ${quantity}`);
        });
      }
    }
    gameLogger.info("=== 资源信息结束 ===");

    // 从角色信息中提取游戏名称和服务器信息，并更新到token列表
    const tokenStore = useTokenStore();
    const token = tokenStore.gameTokens.find((t) => t.id === tokenId);
    if (token) {
      // 优先使用serverName字段获取服务器信息
      const server =
        body?.role?.serverName ||
        body?.serverName ||
        body?.role?.server ||
        body?.server;

      // 只有当服务器信息实际发生变化时才更新，避免循环触发
      if (server && server !== token.server) {
        // 更新token信息
        tokenStore.updateToken(tokenId, {
          server: server,
        });

        gameLogger.verbose(`已更新Token ${tokenId} 的服务器信息`, { server });
      }
    }
  });
}