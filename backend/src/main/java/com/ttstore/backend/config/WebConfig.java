package com.ttstore.backend.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ViewControllerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addViewControllers(ViewControllerRegistry registry) {
        // Redireciona sub-rotas do React para o index.html
        registry.addViewController("/pdv").setViewName("forward:/index.html");
        registry.addViewController("/caixa").setViewName("forward:/index.html");
        registry.addViewController("/estoque").setViewName("forward:/index.html");
        registry.addViewController("/barbearia").setViewName("forward:/index.html");
        registry.addViewController("/fiado").setViewName("forward:/index.html");
        registry.addViewController("/relatorio").setViewName("forward:/index.html");
        registry.addViewController("/auditoria").setViewName("forward:/index.html");
        registry.addViewController("/config").setViewName("forward:/index.html");
        registry.addViewController("/login").setViewName("forward:/index.html");
    }
}
