<?xml version="1.0" encoding="utf-8"?>
<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:atom="http://www.w3.org/2005/Atom">
    <xsl:output method="html" version="1.0" encoding="UTF-8" indent="yes"/>
    <xsl:template match="/">
        <xsl:variable name="title" select="/atom:feed/atom:title"/>
        <xsl:variable name="subtitle" select="/atom:feed/atom:subtitle"/>
        <xsl:variable name="logo" select="/atom:feed/atom:icon"/>
        <xsl:variable name="feedLink" select="/atom:feed/atom:link[@rel='alternate']/@href | /atom:feed/atom:link[not(@rel)]/@href"/>

        <html lang="zh-CN">
            <head>
                <meta charset="utf-8"/>
                <meta name="viewport" content="width=device-width, initial-scale=1"/>
                <title><xsl:value-of select="$title"/> - Feed</title>
                <style>
                    :root {
                    --bg: #ffffff;
                    --fg: #1a1a1a;
                    --accent: #3b82f6;
                    --muted: #666666;
                    --border: #eeeeee;
                    }
                    @media (prefers-color-scheme: dark) {
                    :root {
                    --bg: #121212;
                    --fg: #e5e5e5;
                    --accent: #60a5fa;
                    --muted: #a3a3a3;
                    --border: #262626;
                    }
                    }
                    body {
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                    line-height: 1.6;
                    color: var(--fg);
                    background: var(--bg);
                    margin: 0;
                    padding: 0;
                    transition: background 0.3s ease;
                    }
                    .container {
                    max-width: 700px;
                    margin: 0 auto;
                    padding: 40px 20px;
                    }
                    header {
                    text-align: center;
                    margin-bottom: 60px;
                    }
                    .logo {
                    width: 64px;
                    height: 64px;
                    border-radius: 16px;
                    margin-bottom: 16px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                    }
                    .default-logo {
                    width: 64px;
                    height: 64px;
                    background: var(--accent);
                    color: white;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 32px;
                    font-weight: bold;
                    border-radius: 16px;
                    margin-bottom: 16px;
                    }
                    h1 {
                    font-size: 1.8rem;
                    margin: 0;
                    font-weight: 800;
                    }
                    .subtitle {
                    color: var(--muted);
                    margin-top: 8px;
                    font-size: 1rem;
                    }
                    .feed-meta {
                    font-size: 0.85rem;
                    color: var(--muted);
                    margin-top: 12px;
                    }
                    .feed-meta a {
                    color: var(--accent);
                    text-decoration: none;
                    }
                    hr {
                    border: 0;
                    border-top: 1px solid var(--border);
                    margin: 40px 0;
                    }
                    article {
                    margin-bottom: 48px;
                    }
                    article h2 {
                    font-size: 1.4rem;
                    margin: 0 0 8px 0;
                    }
                    article h2 a {
                    color: var(--fg);
                    text-decoration: none;
                    transition: color 0.2s;
                    }
                    article h2 a:hover {
                    color: var(--accent);
                    }
                    .post-meta {
                    font-size: 0.85rem;
                    color: var(--muted);
                    margin-bottom: 12px;
                    }
                    .summary {
                    font-size: 1rem;
                    color: var(--fg);
                    opacity: 0.9;
                    display: -webkit-box;
                    -webkit-line-clamp: 3;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                    }
                    footer {
                    text-align: center;
                    padding-top: 40px;
                    font-size: 0.8rem;
                    color: var(--muted);
                    border-top: 1px solid var(--border);
                    }
                </style>
            </head>
            <body>
                <main class="container">
                    <header>
                        <xsl:choose>
                            <xsl:when test="$logo">
                                <img src="{$logo}" alt="Logo" class="logo"/>
                            </xsl:when>
                            <xsl:otherwise>
                                <div class="default-logo">
                                    <xsl:value-of select="substring($title, 1, 1)"/>
                                </div>
                            </xsl:otherwise>
                        </xsl:choose>
                        <h1><xsl:value-of select="$title"/></h1>
                        <xsl:if test="$subtitle">
                            <p class="subtitle"><xsl:value-of select="$subtitle"/></p>
                        </xsl:if>
                        <div class="feed-meta">
                            这是来自 <a href="{$feedLink}"><xsl:value-of select="$title"/></a> 的 RSS 订阅源。
                        </div>
                    </header>

                    <section class="posts">
                        <xsl:for-each select="/atom:feed/atom:entry">
                            <article>
                                <h2>
                                    <a href="{atom:link/@href}">
                                        <xsl:value-of select="atom:title"/>
                                    </a>
                                </h2>
                                <div class="post-meta">
                                    发布于 <xsl:value-of select="substring(atom:updated, 1, 10)"/>
                                </div>
                                <div class="summary">
                                    <xsl:choose>
                                        <xsl:when test="atom:summary">
                                            <xsl:value-of select="atom:summary" disable-output-escaping="yes"/>
                                        </xsl:when>
                                        <xsl:otherwise>
                                            <xsl:value-of select="substring(atom:content, 1, 200)" disable-output-escaping="yes"/>...
                                        </xsl:otherwise>
                                    </xsl:choose>
                                </div>
                            </article>
                        </xsl:for-each>
                    </section>

                    <footer>
                        &#169; <xsl:value-of select="substring(/atom:feed/atom:updated, 1, 4)"/> <xsl:text> </xsl:text> <xsl:value-of select="$title"/>. Generated by Hexo.
                    </footer>
                </main>
            </body>
        </html>
    </xsl:template>
</xsl:stylesheet>