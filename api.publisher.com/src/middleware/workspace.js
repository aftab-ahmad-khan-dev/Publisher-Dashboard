const DEFAULT_WORKSPACE = 'joseph-morgan'

export function workspaceMiddleware(req, _res, next) {
  const raw =
    req.headers['x-workspace-id'] ||
    req.query.workspaceId ||
    req.query.workspace
  req.workspaceId = String(raw || DEFAULT_WORKSPACE)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .slice(0, 64)
  next()
}
